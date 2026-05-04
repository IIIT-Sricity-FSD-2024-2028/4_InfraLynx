(function attachDataStore(globalScope) {
  const crims = (globalScope.CRIMS = globalScope.CRIMS || {});
  const api = crims.api;
  const SESSION_KEY = "crims-front-end-session";
  const LANGUAGE_KEY = "crims-front-end-language";
  const REQUEST_STATUS_STEPS = [
    "RECEIVED",
    "UNDER_REVIEW",
    "APPROVED_FOR_PLANNING",
    "CONVERTED_TO_WORK_ORDER",
    "CLOSED"
  ];

  /* ── Local-only helpers (session, language, formatting) ── */

  function storageAvailable(type) {
    try {
      const storage = globalScope[type];
      const probe = "__crims_probe__";
      storage.setItem(probe, probe);
      storage.removeItem(probe);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function translate(key, fallback) {
    const i18n = globalScope.CRIMS && globalScope.CRIMS.i18n;
    if (!i18n || typeof i18n.t !== "function") return fallback;
    return i18n.t(key) || fallback;
  }

  function getLanguage() {
    if (!storageAvailable("localStorage")) return "en";
    return globalScope.localStorage.getItem(LANGUAGE_KEY) || "en";
  }

  function setLanguage(languageCode) {
    if (!storageAvailable("localStorage")) return;
    globalScope.localStorage.setItem(LANGUAGE_KEY, languageCode);
  }

  function getSession() {
    if (!storageAvailable("localStorage")) return null;
    try {
      const raw = globalScope.localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) { return null; }
  }

  function setSession(payload) {
    if (!storageAvailable("localStorage")) return;
    globalScope.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  }

  function clearSession() {
    if (!storageAvailable("localStorage")) return;
    globalScope.localStorage.removeItem(SESSION_KEY);
  }

  function formatDisplayDate(value) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    }).format(new Date(value));
  }

  function formatStatus(status) {
    if (!status) return "Unknown";
    return status.split("_").map((t) => t.charAt(0) + t.slice(1).toLowerCase()).join(" ");
  }

  /* ── In-memory activity feed (front-end only convenience) ── */

  let activityFeedCache = [];
  let latestState = null;

  function prependActivity(title, detail) {
    activityFeedCache = [{
      id: "feed-" + Date.now(),
      title, detail, meta: "Just now"
    }].concat(activityFeedCache).slice(0, 8);
  }

  /* ── Backward-compatible getState / initializeStore ── */
  /* These now fetch everything from the backend and return a combined object */

  async function initializeStore() {
    return getState();
  }

  async function getState() {
    const [
      departments, serviceCategories, requests, workOrders, quotations,
      inspections, issueReports, resourceRequests, progressReports,
      budgetProposals, procurementBills, qcReviews, fundReleases,
      mSchedules, mLogs, sensors, materials, outcomeReports,
      publicData, adminData, activityData, budgetSnapshots,
      officialRoles, officialAccounts
    ] = await Promise.all([
      api.get("/departments"),
      api.get("/service-categories"),
      api.get("/requests"),
      api.get("/work-orders"),
      api.get("/quotations"),
      api.get("/inspections"),
      api.get("/issue-reports"),
      api.get("/resource-requests"),
      api.get("/progress-reports"),
      api.get("/budget-proposals"),
      api.get("/procurement-bills"),
      api.get("/qc-reviews"),
      api.get("/fund-releases"),
      api.get("/maintenance/schedules"),
      api.get("/maintenance/logs"),
      api.get("/field-assets/sensors"),
      api.get("/field-assets/materials"),
      api.get("/outcome-reports"),
      api.get("/public-insights").catch(() => ({ publicStats: [], impactStories: [] })),
      api.get("/public-insights/admin").catch(() => ({ adminAlerts: [] })),
      api.get("/public-insights/activity").catch(() => []),
      api.get("/public-insights/budget-snapshots").catch(() => []),
      api.get("/demo-access/roles").catch(() => []),
      api.get("/demo-access/official-accounts").catch(() => [])
    ]);

    if (activityFeedCache.length === 0 && Array.isArray(activityData)) {
      activityFeedCache = activityData;
    }

    latestState = {
      departments,
      serviceCategories,
      requests,
      workOrders,
      quotations,
      inspections,
      issueReports,
      resourceRequests,
      progressReports,
      budgetProposals,
      procurementBills,
      qcReviews,
      fundReleases,
      maintenanceSchedules: mSchedules,
      maintenanceLogs: mLogs,
      sensorDeployments: sensors,
      taskMaterialLogs: materials,
      outcomeReports,
      publicStats: publicData.publicStats || publicData || [],
      impactStories: publicData.impactStories || [],
      adminAlerts: adminData.adminAlerts || adminData || [],
      budgetSnapshots: budgetSnapshots || [],
      activityFeed: activityFeedCache,
      officialRoles: officialRoles || [],
      officialAccounts: officialAccounts || [],
      citizenUsers: [],
      meta: { seedVersion: "api-connected", systemName: "CRIMS", productName: "InfraLynx" }
    };
    return latestState;
  }

  async function saveState(_nextState) {
    /* No-op: individual CRUD functions now call the API directly */
    return _nextState;
  }

  /* ── Lookup helpers ── */

  function getRoleByCode(roleCode) {
    const roles = latestState ? latestState.officialRoles : [];
    return roles.find((r) => r.code === roleCode);
  }

  function getCategoryById(categoryId) {
    const cats = latestState ? latestState.serviceCategories : [];
    return cats.find((c) => c.id === categoryId);
  }

  function getDepartmentById(departmentId) {
    const depts = latestState ? latestState.departments : [];
    return depts.find((d) => d.id === departmentId);
  }

  /* ── Authentication ── */

  async function authenticateCitizen(identifier, password) {
    const result = await api.post("/demo-access/citizen/sign-in", { identifier, password });
    setSession(result.session);
    return result.account;
  }

  async function authenticateOfficial(email, password) {
    const result = await api.post("/demo-access/official/sign-in", { email, password });
    setSession(result.session);
    return result.account;
  }

  async function registerCitizenAccount(payload) {
    const result = await api.post("/demo-access/citizen/register", {
      aadhaar: payload.aadhaar,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      password: payload.password,
      preferredLanguage: payload.preferredLanguage || "en"
    });
    return result;
  }

  async function lookupCitizenAccount(identifier) {
    return api.post("/demo-access/citizen/lookup", { identifier });
  }

  async function lookupOfficialAccount(email) {
    return api.post("/demo-access/official/lookup", { email });
  }

  async function resetCitizenPassword(identifier, password) {
    return api.patch("/demo-access/citizen/reset-password", { identifier, password });
  }

  async function resetOfficialPassword(email, password) {
    return api.patch("/demo-access/official/reset-password", { identifier: email, password });
  }

  /* ── Citizen Requests ── */

  async function submitCitizenRequest(payload) {
    const record = await api.post("/requests", {
      citizenAadhaar: payload.aadhaar || "",
      requestType: payload.requestType,
      categoryId: payload.categoryId,
      requesterName: payload.name,
      requesterContact: payload.phone,
      requesterEmail: payload.email,
      title: payload.title,
      description: payload.description,
      locationText: payload.locationText,
      urgency: payload.urgency
    });
    prependActivity("New citizen request", record.publicReferenceNo + " was submitted.");
    return record;
  }

  async function findRequestByReference(referenceNumber) {
    try {
      const result = await api.get("/requests/track?ref=" + encodeURIComponent(referenceNumber.trim().toUpperCase()));
      return result || null;
    } catch (_e) { return null; }
  }

  async function getCitizenRequests(identifier) {
    try {
      const result = await api.get("/requests?aadhaar=" + encodeURIComponent(identifier.trim()));
      return result || [];
    } catch (_e) { return []; }
  }

  /* ── Departments ── */

  async function upsertDepartment(payload) {
    let record;
    if (payload.id) {
      record = await api.patch("/departments/" + payload.id, {
        name: payload.name, publicLabel: payload.publicLabel, lead: payload.lead,
        budgetCr: Number(payload.budgetCr), utilization: Number(payload.utilization)
      }, "ADMINISTRATOR");
      prependActivity("Department updated", record.name + " settings were revised.");
    } else {
      record = await api.post("/departments", {
        name: payload.name, publicLabel: payload.publicLabel, lead: payload.lead,
        budgetCr: Number(payload.budgetCr), utilization: Number(payload.utilization)
      }, "ADMINISTRATOR");
      prependActivity("Department added", record.name + " is now available.");
    }
    return record;
  }

  async function deleteDepartment(departmentId) {
    await api.del("/departments/" + departmentId, "ADMINISTRATOR");
    prependActivity("Department removed", "A department was removed from the registry.");
  }

  /* ── Official Accounts ── */

  async function upsertOfficialAccount(payload) {
    let record;
    if (payload.id) {
      record = await api.patch("/demo-access/official-accounts/" + payload.id, {
        role: payload.role, name: payload.name, email: payload.email,
        password: payload.password, departmentId: payload.departmentId || null
      });
      prependActivity("Official account updated", record.name + " access settings were revised.");
    } else {
      record = await api.post("/demo-access/official-accounts", {
        role: payload.role, name: payload.name, email: payload.email,
        password: payload.password, departmentId: payload.departmentId || null
      });
      prependActivity("Official account added", record.name + " was provisioned for " + formatStatus(record.role) + " access.");
    }
    return record;
  }

  async function deleteOfficialAccount(accountId) {
    await api.del("/demo-access/official-accounts/" + accountId);
    prependActivity("Official account removed", "An official account was removed.");
  }

  /* ── Admin Requests ── */

  async function upsertAdminRequest(payload) {
    let record;
    if (payload.requestId) {
      record = await api.patch("/requests/" + payload.requestId, {
        status: payload.status, title: payload.title, description: payload.description, urgency: payload.urgency
      });
      prependActivity("Citizen request updated", (record.publicReferenceNo || payload.requestId) + " was updated.");
    } else {
      record = await api.post("/requests", {
        citizenAadhaar: payload.citizenAadhaar || "000000000000",
        requestType: payload.requestType, categoryId: payload.categoryId,
        requesterName: payload.requesterName, requesterContact: payload.requesterContact,
        requesterEmail: payload.requesterEmail, title: payload.title,
        description: payload.description, locationText: payload.locationText, urgency: payload.urgency
      });
      prependActivity("Citizen request added", (record.publicReferenceNo || "") + " was created from administrator console.");
    }
    return record;
  }

  async function deleteAdminRequest(requestId) {
    await api.del("/requests/" + requestId);
    prependActivity("Citizen request removed", "A request was removed from the queue.");
  }

  /* ── Work Orders ── */

  async function upsertWorkOrder(payload) {
    let record;
    const body = {
      departmentId: payload.departmentId, requestId: payload.requestId || "",
      title: payload.title, locationText: payload.locationText,
      engineerId: payload.engineerId || "", priority: payload.priority,
      status: payload.status, dueDate: payload.dueDate, notes: payload.notes || "",
      approvedBy: payload.approvedBy || null,
      approvedAt: payload.approvedAt || null,
      rejectedBy: payload.rejectedBy || null,
      rejectedAt: payload.rejectedAt || null
    };
    if (payload.id) {
      record = await api.patch("/work-orders/" + payload.id, body);
      prependActivity("Work order updated", (record.referenceNo || payload.id) + " was updated.");
    } else {
      record = await api.post("/work-orders", body);
      prependActivity("Work order created", (record.referenceNo || "") + " was created.");
    }
    return record;
  }

  async function deleteWorkOrder(workOrderId) {
    await api.del("/work-orders/" + workOrderId);
    prependActivity("Work order removed", "A work order was removed.");
  }

  /* ── Quotations ── */

  async function upsertQuotation(payload) {
    const body = {
      departmentId: payload.departmentId, vendor: payload.vendor, item: payload.item,
      amountLakhs: Number(payload.amountLakhs),
      gstValid: payload.gstValid === true || payload.gstValid === "true",
      status: payload.status
    };
    let record;
    if (payload.id) {
      record = await api.patch("/quotations/" + payload.id, body);
      prependActivity("Quotation updated", record.vendor + " quotation was updated.");
    } else {
      record = await api.post("/quotations", body);
      prependActivity("Quotation added", record.vendor + " quotation entered verification.");
    }
    return record;
  }

  async function deleteQuotation(quotationId) {
    await api.del("/quotations/" + quotationId);
    prependActivity("Quotation removed", "A quotation was removed from review.");
  }

  /* ── Maintenance Schedules ── */

  async function upsertMaintenanceSchedule(payload) {
    const body = {
      departmentId: payload.departmentId, title: payload.title,
      frequency: payload.frequency, nextDate: payload.nextDate, assignee: payload.assignee || ""
    };
    let record;
    if (payload.id) {
      record = await api.patch("/maintenance/schedules/" + payload.id, body);
      prependActivity("Maintenance schedule updated", record.title + " was revised.");
    } else {
      record = await api.post("/maintenance/schedules", body);
      prependActivity("Maintenance schedule added", record.title + " was added.");
    }
    return record;
  }

  async function deleteMaintenanceSchedule(scheduleId) {
    await api.del("/maintenance/schedules/" + scheduleId);
    prependActivity("Maintenance schedule removed", "A schedule was removed.");
  }

  /* ── Inspections ── */

  async function upsertInspection(payload) {
    const body = {
      departmentId: payload.departmentId, engineerId: payload.engineerId,
      title: payload.title, locationText: payload.locationText,
      severity: payload.severity, dueDate: payload.dueDate, status: payload.status
    };
    let record;
    if (payload.id) {
      record = await api.patch("/inspections/" + payload.id, body);
      prependActivity("Inspection updated", record.title + " was updated.");
    } else {
      record = await api.post("/inspections", body);
      prependActivity("Inspection added", record.title + " was added.");
    }
    return record;
  }

  async function deleteInspection(inspectionId) {
    await api.del("/inspections/" + inspectionId);
    prependActivity("Inspection removed", "An inspection was removed.");
  }

  /* ── Issue Reports ── */

  async function upsertIssueReport(payload) {
    const body = {
      departmentId: payload.departmentId, engineerId: payload.engineerId,
      title: payload.title, category: payload.category, locationText: payload.locationText,
      severity: payload.severity, status: payload.status
    };
    let record;
    if (payload.id) {
      record = await api.patch("/issue-reports/" + payload.id, body);
      prependActivity("Issue report updated", record.title + " was updated.");
    } else {
      record = await api.post("/issue-reports", body);
      prependActivity("Issue report logged", record.title + " was logged.");
    }
    return record;
  }

  async function deleteIssueReport(issueId) {
    await api.del("/issue-reports/" + issueId);
    prependActivity("Issue report removed", "An issue report was removed.");
  }

  /* ── Resource Requests ── */

  async function upsertResourceRequest(payload) {
    const body = {
      departmentId: payload.departmentId, engineerId: payload.engineerId,
      item: payload.item, quantity: payload.quantity, urgency: payload.urgency, status: payload.status
    };
    let record;
    if (payload.id) {
      record = await api.patch("/resource-requests/" + payload.id, body);
      prependActivity("Resource request updated", record.item + " request was updated.");
    } else {
      record = await api.post("/resource-requests", body);
      prependActivity("Resource request raised", record.item + " request was raised.");
    }
    return record;
  }

  async function deleteResourceRequest(resourceId) {
    await api.del("/resource-requests/" + resourceId);
    prependActivity("Resource request removed", "A resource request was removed.");
  }

  /* ── Progress Reports ── */

  async function upsertProgressReport(payload) {
    const body = {
      departmentId: payload.departmentId, engineerId: payload.engineerId,
      workOrderId: payload.workOrderId || "", title: payload.title,
      summary: payload.summary, status: payload.status
    };
    let record;
    if (payload.id) {
      record = await api.patch("/progress-reports/" + payload.id, body);
      prependActivity("Progress report updated", record.title + " was updated.");
    } else {
      record = await api.post("/progress-reports", body);
      prependActivity("Progress report submitted", record.title + " was submitted.");
    }
    return record;
  }

  async function deleteProgressReport(reportId) {
    await api.del("/progress-reports/" + reportId);
    prependActivity("Progress report removed", "A progress report was removed.");
  }

  /* ── Budget Proposals ── */

  async function upsertBudgetProposal(payload) {
    const body = {
      departmentId: payload.departmentId, title: payload.title,
      amountCr: Number(payload.amountCr), stage: payload.stage,
      justification: payload.justification, requestedBy: payload.requestedBy || ""
    };
    let record;
    if (payload.id) {
      record = await api.patch("/budget-proposals/" + payload.id, body);
      prependActivity("Budget proposal updated", record.title + " was updated.");
    } else {
      record = await api.post("/budget-proposals", body);
      prependActivity("Budget proposal added", record.title + " entered the finance queue.");
    }
    return record;
  }

  async function deleteBudgetProposal(proposalId) {
    await api.del("/budget-proposals/" + proposalId);
    prependActivity("Budget proposal removed", "A budget proposal was removed.");
  }

  /* ── Procurement Bills ── */

  async function upsertProcurementBill(payload) {
    const body = {
      departmentId: payload.departmentId, vendor: payload.vendor,
      workOrderId: payload.workOrderId || "",
      amountLakhs: Number(payload.amountLakhs),
      gstValid: payload.gstValid === true || payload.gstValid === "true",
      status: payload.status
    };
    let record;
    if (payload.id) {
      record = await api.patch("/procurement-bills/" + payload.id, body);
      prependActivity("Procurement bill updated", record.vendor + " bill status was updated.");
    } else {
      record = await api.post("/procurement-bills", body);
      prependActivity("Procurement bill added", record.vendor + " bill entered verification.");
    }
    return record;
  }

  async function deleteProcurementBill(billId) {
    await api.del("/procurement-bills/" + billId);
    prependActivity("Procurement bill removed", "A procurement bill was removed.");
  }

  /* ── QC Reviews ── */

  async function upsertQcReview(payload) {
    const body = {
      departmentId: payload.departmentId, workOrderId: payload.workOrderId || "",
      title: payload.title, reviewer: payload.reviewer || "",
      finding: payload.finding, status: payload.status, score: Number(payload.score)
    };
    let record;
    if (payload.id) {
      record = await api.patch("/qc-reviews/" + payload.id, body);
      prependActivity("QC review updated", record.title + " was updated.");
    } else {
      record = await api.post("/qc-reviews", body);
      prependActivity("QC review added", record.title + " entered the QC queue.");
    }
    return record;
  }

  async function deleteQcReview(reviewId) {
    await api.del("/qc-reviews/" + reviewId);
    prependActivity("QC review removed", "A QC review was removed.");
  }

  /* ── Fund Releases ── */

  async function upsertFundRelease(payload) {
    const body = {
      departmentId: payload.departmentId, proposalId: payload.proposalId || "",
      title: payload.title, amountCr: Number(payload.amountCr),
      quarter: payload.quarter || "", status: payload.status, notes: payload.notes || ""
    };
    let record;
    if (payload.id) {
      record = await api.patch("/fund-releases/" + payload.id, body);
      prependActivity("Fund release updated", record.title + " was updated.");
    } else {
      record = await api.post("/fund-releases", body);
      prependActivity("Fund release created", record.title + " entered the release queue.");
    }
    return record;
  }

  async function deleteFundRelease(releaseId) {
    await api.del("/fund-releases/" + releaseId);
    prependActivity("Fund release removed", "A fund release was removed.");
  }

  /* ── Maintenance Logs ── */

  async function upsertMaintenanceLog(payload) {
    const body = {
      departmentId: payload.departmentId, engineerId: payload.engineerId,
      scheduleId: payload.scheduleId || "", workOrderId: payload.workOrderId || "",
      title: payload.title, activity: payload.activity || "",
      hoursSpent: Number(payload.hoursSpent) || 0, date: payload.date, status: payload.status
    };
    let record;
    if (payload.id) {
      record = await api.patch("/maintenance/logs/" + payload.id, body);
      prependActivity("Maintenance log updated", record.title + " was updated.");
    } else {
      record = await api.post("/maintenance/logs", body);
      prependActivity("Maintenance log added", record.title + " was logged.");
    }
    return record;
  }

  async function deleteMaintenanceLog(logId) {
    await api.del("/maintenance/logs/" + logId);
    prependActivity("Maintenance log removed", "A maintenance log was removed.");
  }

  /* ── Sensor Deployments ── */

  async function upsertSensorDeployment(payload) {
    const body = {
      departmentId: payload.departmentId, engineerId: payload.engineerId,
      workOrderId: payload.workOrderId || "", sensorType: payload.sensorType,
      assetLocation: payload.assetLocation, serialNo: payload.serialNo || "",
      status: payload.status, notes: payload.notes || ""
    };
    let record;
    if (payload.id) {
      record = await api.patch("/field-assets/sensors/" + payload.id, body);
      prependActivity("Sensor deployment updated", record.sensorType + " was updated.");
    } else {
      record = await api.post("/field-assets/sensors", body);
      prependActivity("Sensor deployed", record.sensorType + " installed at " + record.assetLocation + ".");
    }
    return record;
  }

  async function deleteSensorDeployment(sensorId) {
    await api.del("/field-assets/sensors/" + sensorId);
    prependActivity("Sensor removed", "A sensor deployment record was removed.");
  }

  /* ── Task Material Logs ── */

  async function upsertTaskMaterialLog(payload) {
    const body = {
      departmentId: payload.departmentId, engineerId: payload.engineerId,
      workOrderId: payload.workOrderId || "", material: payload.material,
      quantity: payload.quantity, unit: payload.unit || "",
      usedOn: payload.usedOn, notes: payload.notes || ""
    };
    let record;
    if (payload.id) {
      record = await api.patch("/field-assets/materials/" + payload.id, body);
      prependActivity("Material log updated", record.material + " log was updated.");
    } else {
      record = await api.post("/field-assets/materials", body);
      prependActivity("Material logged", record.material + " usage was recorded.");
    }
    return record;
  }

  async function deleteTaskMaterialLog(logId) {
    await api.del("/field-assets/materials/" + logId);
    prependActivity("Material log removed", "A material log was removed.");
  }

  /* ── Outcome Reports ── */

  async function upsertOutcomeReport(payload) {
    const body = {
      departmentId: payload.departmentId, workOrderId: payload.workOrderId || "",
      preparedBy: payload.preparedBy || "", title: payload.title,
      summary: payload.summary || "", budgetSanctioned: Number(payload.budgetSanctioned) || 0,
      budgetUsed: Number(payload.budgetUsed) || 0, outcome: payload.outcome || "PENDING",
      lessonsLearned: payload.lessonsLearned || ""
    };
    let record;
    if (payload.id) {
      record = await api.patch("/outcome-reports/" + payload.id, body);
      prependActivity("Outcome report updated", record.title + " was updated.");
    } else {
      record = await api.post("/outcome-reports", body);
      prependActivity("Outcome report submitted", record.title + " was submitted.");
    }
    return record;
  }

  async function deleteOutcomeReport(reportId) {
    await api.del("/outcome-reports/" + reportId);
    prependActivity("Outcome report removed", "An outcome report was removed.");
  }

  /* ── Expose public API (same signature as before, now async) ── */

  crims.store = {
    REQUEST_STATUS_STEPS,
    initializeStore,
    getState,
    saveState,
    getLanguage,
    setLanguage,
    getSession,
    setSession,
    clearSession,
    getRoleByCode,
    getCategoryById,
    getDepartmentById,
    registerCitizenAccount,
    lookupCitizenAccount,
    lookupOfficialAccount,
    resetCitizenPassword,
    resetOfficialPassword,
    authenticateCitizen,
    authenticateOfficial,
    submitCitizenRequest,
    upsertDepartment,
    deleteDepartment,
    upsertOfficialAccount,
    deleteOfficialAccount,
    upsertAdminRequest,
    deleteAdminRequest,
    upsertWorkOrder,
    deleteWorkOrder,
    upsertQuotation,
    deleteQuotation,
    upsertMaintenanceSchedule,
    deleteMaintenanceSchedule,
    upsertInspection,
    deleteInspection,
    upsertIssueReport,
    deleteIssueReport,
    upsertResourceRequest,
    deleteResourceRequest,
    upsertProgressReport,
    deleteProgressReport,
    upsertBudgetProposal,
    deleteBudgetProposal,
    upsertProcurementBill,
    deleteProcurementBill,
    upsertQcReview,
    deleteQcReview,
    upsertFundRelease,
    deleteFundRelease,
    upsertMaintenanceLog,
    deleteMaintenanceLog,
    upsertSensorDeployment,
    deleteSensorDeployment,
    upsertTaskMaterialLog,
    deleteTaskMaterialLog,
    upsertOutcomeReport,
    deleteOutcomeReport,
    findRequestByReference,
    getCitizenRequests,
    formatDisplayDate,
    formatStatus
  };
})(window);




