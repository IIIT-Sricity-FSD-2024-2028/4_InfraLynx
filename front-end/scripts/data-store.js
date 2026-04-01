(function attachDataStore(globalScope) {
  const crims = (globalScope.CRIMS = globalScope.CRIMS || {});
  const FALLBACK_SEED_DATA = crims.seedData;
  const STORE_KEY = "crims-front-end-state-v2";
  const SESSION_KEY = "crims-front-end-session";
  const LANGUAGE_KEY = "crims-front-end-language";
  const COLLECTION_KEYS = [
    "departments",
    "serviceCategories",
    "publicStats",
    "impactStories",
    "officialRoles",
    "officialAccounts",
    "citizenUsers",
    "requests",
    "adminAlerts",
    "budgetSnapshots",
    "activityFeed",
    "workOrders",
    "quotations",
    "maintenanceSchedules",
    "inspections",
    "issueReports",
    "resourceRequests",
    "progressReports",
    "budgetProposals",
    "procurementBills",
    "qcReviews",
    "fundReleases",
    "maintenanceLogs",
    "sensorDeployments",
    "taskMaterialLogs",
    "outcomeReports"
  ];
  const REQUEST_STATUS_STEPS = [
    "RECEIVED",
    "UNDER_REVIEW",
    "APPROVED_FOR_PLANNING",
    "CONVERTED_TO_WORK_ORDER",
    "CLOSED"
  ];

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

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

  function readLocalStorage(key, fallback) {
    if (!storageAvailable("localStorage")) {
      return fallback;
    }

    const raw = globalScope.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  }

  function writeLocalStorage(key, value) {
    if (!storageAvailable("localStorage")) {
      return;
    }

    globalScope.localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeState(candidateState) {
    const seededState = clone(FALLBACK_SEED_DATA);
    const currentVersion = seededState.meta.seedVersion;
    const sourceState = candidateState && typeof candidateState === "object" ? candidateState : {};

    // If the stored seed version doesn't match the current one, discard all
    // stale collections and re-seed from scratch. This prevents login failures
    // caused by outdated localStorage across different browsers.
    const storedVersion = sourceState.meta && sourceState.meta.seedVersion;
    const isStale = storedVersion !== currentVersion;

    const normalizedState = {
      ...seededState,
      ...sourceState,
      meta: {
        ...seededState.meta,
        ...(sourceState.meta || {}),
        seedVersion: currentVersion
      }
    };

    COLLECTION_KEYS.forEach((key) => {
      if (isStale) {
        // Stale version — always use fresh seed data so accounts are correct
        normalizedState[key] = clone(seededState[key] || []);
      } else {
        normalizedState[key] = Array.isArray(sourceState[key]) ? sourceState[key] : clone(seededState[key] || []);
      }
    });

    return normalizedState;
  }

  function initializeStore() {
    const existing = readLocalStorage(STORE_KEY, null);
    const normalizedState = normalizeState(existing);
    writeLocalStorage(STORE_KEY, normalizedState);
    return normalizedState;
  }

  function getState() {
    const existing = readLocalStorage(STORE_KEY, null);
    return normalizeState(existing);
  }

  function saveState(nextState) {
    const normalizedState = normalizeState(nextState);
    writeLocalStorage(STORE_KEY, normalizedState);
    return normalizedState;
  }

  function getLanguage() {
    if (!storageAvailable("localStorage")) {
      return "en";
    }

    return globalScope.localStorage.getItem(LANGUAGE_KEY) || "en";
  }

  function setLanguage(languageCode) {
    if (!storageAvailable("localStorage")) {
      return;
    }

    globalScope.localStorage.setItem(LANGUAGE_KEY, languageCode);
  }

  function getSession() {
    return readLocalStorage(SESSION_KEY, null);
  }

  function setSession(payload) {
    writeLocalStorage(SESSION_KEY, payload);
  }

  function clearSession() {
    if (!storageAvailable("localStorage")) {
      return;
    }

    globalScope.localStorage.removeItem(SESSION_KEY);
  }

  function getRoleByCode(roleCode) {
    return getState().officialRoles.find((role) => role.code === roleCode);
  }

  function getCategoryById(categoryId) {
    return getState().serviceCategories.find((category) => category.id === categoryId);
  }

  function getDepartmentById(departmentId) {
    return getState().departments.find((department) => department.id === departmentId);
  }

  function createId(prefix) {
    if (globalScope.crypto && globalScope.crypto.randomUUID) {
      return `${prefix}-${globalScope.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function generateReferenceNumber(requests) {
    const year = new Date().getFullYear();
    const maxSequence = requests.reduce((maxValue, request) => {
      const match = String(request.publicReferenceNo || "").match(/CRIMS-\d{4}-(\d+)/);
      if (!match) {
        return maxValue;
      }

      return Math.max(maxValue, Number(match[1]));
    }, 0);

    return `CRIMS-${year}-${String(maxSequence + 1).padStart(4, "0")}`;
  }

  function registerCitizenAccount(payload) {
    const state = getState();
    const aadhaarMatch = state.citizenUsers.find((user) => user.aadhaar === payload.aadhaar);

    if (aadhaarMatch) {
      throw new Error("An account already exists for this Aadhaar number.");
    }

    const emailMatch = state.citizenUsers.find((user) => user.email.toLowerCase() === payload.email.toLowerCase());
    if (emailMatch) {
      throw new Error("This email is already linked to an existing citizen account.");
    }

    const citizenRecord = {
      id: createId("citizen"),
      aadhaar: payload.aadhaar,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      password: payload.password,
      preferredLanguage: payload.preferredLanguage || "en",
      createdAt: new Date().toISOString()
    };

    state.citizenUsers.unshift(citizenRecord);
    saveState(state);

    return citizenRecord;
  }

  function authenticateCitizen(identifier, password) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const citizen = getState().citizenUsers.find((user) => {
      return user.aadhaar === normalizedIdentifier || user.email.toLowerCase() === normalizedIdentifier;
    });

    if (!citizen || citizen.password !== password) {
      throw new Error("Citizen sign-in failed. Check the Aadhaar or email and password.");
    }

    const session = {
      type: "citizen",
      citizenId: citizen.id,
      citizenName: citizen.name,
      aadhaar: citizen.aadhaar,
      createdAt: new Date().toISOString()
    };

    setSession(session);
    return citizen;
  }

  function authenticateOfficial(email, password) {
    const account = getState().officialAccounts.find((item) => {
      return item.email.toLowerCase() === email.toLowerCase();
    });

    if (!account || account.password !== password) {
      throw new Error("Sign-in failed. Check your email and password.");
    }

    const session = {
      type: "official",
      officialId: account.id,
      role: account.role,
      name: account.name,
      createdAt: new Date().toISOString()
    };

    setSession(session);
    return account;
  }

  function ensureCitizenIdentity(state, payload) {
    const aadhaarMatch = state.citizenUsers.find((user) => user.aadhaar === payload.aadhaar);

    if (!aadhaarMatch) {
      const citizenRecord = {
        id: createId("citizen"),
        aadhaar: payload.aadhaar,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        password: null,
        preferredLanguage: getLanguage(),
        createdAt: new Date().toISOString()
      };

      state.citizenUsers.unshift(citizenRecord);
      return citizenRecord;
    }

    const matchesKnownIdentity =
      aadhaarMatch.name.trim().toLowerCase() === payload.name.trim().toLowerCase() &&
      aadhaarMatch.phone === payload.phone &&
      aadhaarMatch.email.toLowerCase() === payload.email.toLowerCase();

    if (!matchesKnownIdentity) {
      throw new Error(
        "This Aadhaar number is already linked to another citizen identity. Use matching contact details or sign in first."
      );
    }

    return aadhaarMatch;
  }

  function submitCitizenRequest(payload) {
    const state = getState();
    const citizen = ensureCitizenIdentity(state, payload);
    const category = getCategoryById(payload.categoryId);

    if (!category) {
      throw new Error("Select a valid service category before submitting the request.");
    }

    const requestRecord = {
      requestId: createId("request"),
      publicReferenceNo: generateReferenceNumber(state.requests),
      citizenAadhaar: citizen.aadhaar,
      requestType: payload.requestType,
      categoryId: payload.categoryId,
      departmentId: category.departmentId,
      requesterName: payload.name,
      requesterContact: payload.phone,
      requesterEmail: payload.email,
      title: payload.title,
      description: payload.description,
      locationText: payload.locationText,
      urgency: payload.urgency,
      status: "RECEIVED",
      receivedAt: new Date().toISOString()
    };

    state.requests.unshift(requestRecord);
    saveState(state);

    return requestRecord;
  }

  function findRequestByReference(referenceNumber) {
    const normalizedReference = referenceNumber.trim().toUpperCase();
    return getState().requests.find((request) => request.publicReferenceNo === normalizedReference) || null;
  }

  function getCitizenRequests(identifier) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const citizen = getState().citizenUsers.find((user) => {
      return user.aadhaar === normalizedIdentifier || user.email.toLowerCase() === normalizedIdentifier;
    });

    if (!citizen) {
      return [];
    }

    return getState().requests.filter((request) => request.citizenAadhaar === citizen.aadhaar);
  }

  function formatDisplayDate(value) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  }

  function formatStatus(status) {
    if (!status) {
      return "Unknown";
    }

    return status
      .split("_")
      .map((token) => token.charAt(0) + token.slice(1).toLowerCase())
      .join(" ");
  }

  function prependActivity(state, title, detail) {
    const nextFeedItem = {
      id: createId("feed"),
      title,
      detail,
      meta: "Just now"
    };

    state.activityFeed = [nextFeedItem].concat(state.activityFeed || []).slice(0, 8);
  }

  function upsertDepartment(payload) {
    const state = getState();
    const normalizedName = payload.name.trim().toLowerCase();
    const duplicate = state.departments.find((department) => {
      return department.name.trim().toLowerCase() === normalizedName && department.id !== payload.id;
    });

    if (duplicate) {
      throw new Error("A department with this name already exists.");
    }

    const departmentRecord = {
      id: payload.id || `dept-${slugify(payload.name) || Date.now()}`,
      name: payload.name.trim(),
      publicLabel: payload.publicLabel.trim(),
      lead: payload.lead.trim(),
      budgetCr: Number(payload.budgetCr),
      utilization: Number(payload.utilization)
    };

    if (payload.id) {
      state.departments = state.departments.map((department) => {
        return department.id === payload.id ? departmentRecord : department;
      });
      prependActivity(state, "Department updated", `${departmentRecord.name} settings were revised by the administrator.`);
    } else {
      state.departments.unshift(departmentRecord);
      prependActivity(state, "Department added", `${departmentRecord.name} is now available in the administrator registry.`);
    }

    saveState(state);
    return departmentRecord;
  }

  function deleteDepartment(departmentId) {
    const state = getState();
    const department = state.departments.find((item) => item.id === departmentId);

    if (!department) {
      throw new Error("Department not found.");
    }

    const hasRequests = state.requests.some((request) => request.departmentId === departmentId);
    const hasAccounts = state.officialAccounts.some((account) => account.departmentId === departmentId);

    if (hasRequests || hasAccounts) {
      throw new Error("This department is still linked to requests or official accounts.");
    }

    state.departments = state.departments.filter((item) => item.id !== departmentId);
    prependActivity(state, "Department removed", `${department.name} was removed from the prototype registry.`);
    saveState(state);
  }

  function upsertOfficialAccount(payload) {
    const state = getState();
    const normalizedEmail = payload.email.trim().toLowerCase();
    const duplicate = state.officialAccounts.find((account) => {
      return account.email.toLowerCase() === normalizedEmail && account.id !== payload.id;
    });

    if (duplicate) {
      throw new Error("An official account already exists for this email address.");
    }

    const officialRecord = {
      id: payload.id || createId("official"),
      role: payload.role,
      name: payload.name.trim(),
      email: normalizedEmail,
      password: payload.password.trim(),
      departmentId: payload.departmentId || null
    };

    if (payload.id) {
      state.officialAccounts = state.officialAccounts.map((account) => {
        return account.id === payload.id ? officialRecord : account;
      });
      prependActivity(state, "Official account updated", `${officialRecord.name} access settings were revised.`);
    } else {
      state.officialAccounts.unshift(officialRecord);
      prependActivity(state, "Official account added", `${officialRecord.name} was provisioned for ${formatStatus(officialRecord.role)} access.`);
    }

    saveState(state);
    return officialRecord;
  }

  function deleteOfficialAccount(accountId) {
    const state = getState();
    const account = state.officialAccounts.find((item) => item.id === accountId);

    if (!account) {
      throw new Error("Official account not found.");
    }

    state.officialAccounts = state.officialAccounts.filter((item) => item.id !== accountId);
    prependActivity(state, "Official account removed", `${account.name} was removed from official access.`);
    saveState(state);
  }

  function upsertAdminRequest(payload) {
    const state = getState();
    const category = state.serviceCategories.find((item) => item.id === payload.categoryId);

    if (!category) {
      throw new Error("Select a valid service category.");
    }

    const requestRecord = {
      requestId: payload.requestId || createId("request"),
      publicReferenceNo: payload.publicReferenceNo || generateReferenceNumber(state.requests),
      citizenAadhaar: payload.citizenAadhaar || "000000000000",
      requestType: payload.requestType,
      categoryId: payload.categoryId,
      departmentId: category.departmentId,
      requesterName: payload.requesterName.trim(),
      requesterContact: payload.requesterContact.trim(),
      requesterEmail: payload.requesterEmail.trim().toLowerCase(),
      title: payload.title.trim(),
      description: payload.description.trim(),
      locationText: payload.locationText.trim(),
      urgency: payload.urgency,
      status: payload.status,
      receivedAt: payload.receivedAt || new Date().toISOString()
    };

    if (payload.requestId) {
      state.requests = state.requests.map((request) => {
        return request.requestId === payload.requestId ? requestRecord : request;
      });
      prependActivity(state, "Citizen request updated", `${requestRecord.publicReferenceNo} was updated in the administrator control room.`);
    } else {
      state.requests.unshift(requestRecord);
      prependActivity(state, "Citizen request added", `${requestRecord.publicReferenceNo} was created from the administrator console.`);
    }

    saveState(state);
    return requestRecord;
  }

  function deleteAdminRequest(requestId) {
    const state = getState();
    const request = state.requests.find((item) => item.requestId === requestId);

    if (!request) {
      throw new Error("Request not found.");
    }

    state.requests = state.requests.filter((item) => item.requestId !== requestId);
    prependActivity(state, "Citizen request removed", `${request.publicReferenceNo} was removed from the administrator queue.`);
    saveState(state);
  }

  function upsertWorkOrder(payload) {
    const state = getState();
    const workOrderRecord = {
      id: payload.id || createId("wo"),
      referenceNo: payload.referenceNo || `WO-${String(Date.now()).slice(-4)}`,
      departmentId: payload.departmentId,
      requestId: payload.requestId || "",
      title: payload.title.trim(),
      locationText: payload.locationText.trim(),
      engineerId: payload.engineerId || "",
      priority: payload.priority,
      status: payload.status,
      dueDate: payload.dueDate,
      notes: payload.notes.trim()
    };

    if (payload.id) {
      state.workOrders = state.workOrders.map((item) => {
        return item.id === payload.id ? workOrderRecord : item;
      });
      prependActivity(state, "Work order updated", `${workOrderRecord.referenceNo} was updated by the Department Officer.`);
    } else {
      state.workOrders.unshift(workOrderRecord);
      prependActivity(state, "Work order created", `${workOrderRecord.referenceNo} was created for ${workOrderRecord.title}.`);
    }

    saveState(state);
    return workOrderRecord;
  }

  function deleteWorkOrder(workOrderId) {
    const state = getState();
    const workOrder = state.workOrders.find((item) => item.id === workOrderId);

    if (!workOrder) {
      throw new Error("Work order not found.");
    }

    state.workOrders = state.workOrders.filter((item) => item.id !== workOrderId);
    prependActivity(state, "Work order removed", `${workOrder.referenceNo} was removed from the operational queue.`);
    saveState(state);
  }

  function upsertQuotation(payload) {
    const state = getState();
    const quotationRecord = {
      id: payload.id || createId("quote"),
      departmentId: payload.departmentId,
      vendor: payload.vendor.trim(),
      item: payload.item.trim(),
      amountLakhs: Number(payload.amountLakhs),
      gstValid: payload.gstValid === true || payload.gstValid === "true",
      status: payload.status
    };

    if (payload.id) {
      state.quotations = state.quotations.map((item) => {
        return item.id === payload.id ? quotationRecord : item;
      });
      prependActivity(state, "Quotation updated", `${quotationRecord.vendor} quotation was updated for ${quotationRecord.item}.`);
    } else {
      state.quotations.unshift(quotationRecord);
      prependActivity(state, "Quotation added", `${quotationRecord.vendor} quotation entered department verification.`);
    }

    saveState(state);
    return quotationRecord;
  }

  function deleteQuotation(quotationId) {
    const state = getState();
    const quotation = state.quotations.find((item) => item.id === quotationId);

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    state.quotations = state.quotations.filter((item) => item.id !== quotationId);
    prependActivity(state, "Quotation removed", `${quotation.vendor} quotation was removed from review.`);
    saveState(state);
  }

  function upsertMaintenanceSchedule(payload) {
    const state = getState();
    const scheduleRecord = {
      id: payload.id || createId("schedule"),
      departmentId: payload.departmentId,
      title: payload.title.trim(),
      frequency: payload.frequency,
      nextDate: payload.nextDate,
      assignee: payload.assignee || ""
    };

    if (payload.id) {
      state.maintenanceSchedules = state.maintenanceSchedules.map((item) => {
        return item.id === payload.id ? scheduleRecord : item;
      });
      prependActivity(state, "Maintenance schedule updated", `${scheduleRecord.title} was revised by the Department Officer.`);
    } else {
      state.maintenanceSchedules.unshift(scheduleRecord);
      prependActivity(state, "Maintenance schedule added", `${scheduleRecord.title} was added to the maintenance calendar.`);
    }

    saveState(state);
    return scheduleRecord;
  }

  function deleteMaintenanceSchedule(scheduleId) {
    const state = getState();
    const schedule = state.maintenanceSchedules.find((item) => item.id === scheduleId);

    if (!schedule) {
      throw new Error("Maintenance schedule not found.");
    }

    state.maintenanceSchedules = state.maintenanceSchedules.filter((item) => item.id !== scheduleId);
    prependActivity(state, "Maintenance schedule removed", `${schedule.title} was removed from the calendar.`);
    saveState(state);
  }

  function upsertInspection(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("inspection"),
      departmentId: payload.departmentId,
      engineerId: payload.engineerId,
      title: payload.title.trim(),
      locationText: payload.locationText.trim(),
      severity: payload.severity,
      dueDate: payload.dueDate,
      status: payload.status
    };

    if (payload.id) {
      state.inspections = state.inspections.map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Inspection updated", `${record.title} inspection was updated in the field queue.`);
    } else {
      state.inspections.unshift(record);
      prependActivity(state, "Inspection added", `${record.title} inspection was added for field follow-up.`);
    }

    saveState(state);
    return record;
  }

  function deleteInspection(inspectionId) {
    const state = getState();
    const inspection = state.inspections.find((item) => item.id === inspectionId);
    if (!inspection) {
      throw new Error("Inspection not found.");
    }
    state.inspections = state.inspections.filter((item) => item.id !== inspectionId);
    prependActivity(state, "Inspection removed", `${inspection.title} was removed from the field queue.`);
    saveState(state);
  }

  function upsertIssueReport(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("issue"),
      departmentId: payload.departmentId,
      engineerId: payload.engineerId,
      title: payload.title.trim(),
      category: payload.category.trim(),
      locationText: payload.locationText.trim(),
      severity: payload.severity,
      status: payload.status
    };

    if (payload.id) {
      state.issueReports = state.issueReports.map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Issue report updated", `${record.title} was updated by the field engineer.`);
    } else {
      state.issueReports.unshift(record);
      prependActivity(state, "Issue report logged", `${record.title} was logged from the field.`);
    }

    saveState(state);
    return record;
  }

  function deleteIssueReport(issueId) {
    const state = getState();
    const issue = state.issueReports.find((item) => item.id === issueId);
    if (!issue) {
      throw new Error("Issue report not found.");
    }
    state.issueReports = state.issueReports.filter((item) => item.id !== issueId);
    prependActivity(state, "Issue report removed", `${issue.title} was removed from field reporting.`);
    saveState(state);
  }

  function upsertResourceRequest(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("resource"),
      departmentId: payload.departmentId,
      engineerId: payload.engineerId,
      item: payload.item.trim(),
      quantity: payload.quantity.trim(),
      urgency: payload.urgency,
      status: payload.status
    };

    if (payload.id) {
      state.resourceRequests = state.resourceRequests.map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Resource request updated", `${record.item} request was updated in field operations.`);
    } else {
      state.resourceRequests.unshift(record);
      prependActivity(state, "Resource request raised", `${record.item} request was raised from the field.`);
    }

    saveState(state);
    return record;
  }

  function deleteResourceRequest(resourceId) {
    const state = getState();
    const request = state.resourceRequests.find((item) => item.id === resourceId);
    if (!request) {
      throw new Error("Resource request not found.");
    }
    state.resourceRequests = state.resourceRequests.filter((item) => item.id !== resourceId);
    prependActivity(state, "Resource request removed", `${request.item} request was removed from field operations.`);
    saveState(state);
  }

  function upsertProgressReport(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("report"),
      departmentId: payload.departmentId,
      engineerId: payload.engineerId,
      workOrderId: payload.workOrderId || "",
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      status: payload.status,
      submittedAt: payload.submittedAt || new Date().toISOString()
    };

    if (payload.id) {
      state.progressReports = state.progressReports.map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Progress report updated", `${record.title} was updated for officer review.`);
    } else {
      state.progressReports.unshift(record);
      prependActivity(state, "Progress report submitted", `${record.title} was submitted from the field.`);
    }

    saveState(state);
    return record;
  }

  function deleteProgressReport(reportId) {
    const state = getState();
    const report = state.progressReports.find((item) => item.id === reportId);
    if (!report) {
      throw new Error("Progress report not found.");
    }
    state.progressReports = state.progressReports.filter((item) => item.id !== reportId);
    prependActivity(state, "Progress report removed", `${report.title} was removed from field reporting.`);
    saveState(state);
  }

  function upsertBudgetProposal(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("proposal"),
      departmentId: payload.departmentId,
      title: payload.title.trim(),
      amountCr: Number(payload.amountCr),
      stage: payload.stage,
      justification: payload.justification.trim(),
      requestedBy: payload.requestedBy || ""
    };
    if (payload.id) {
      state.budgetProposals = state.budgetProposals.map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Budget proposal updated", `${record.title} was updated in CFO review.`);
    } else {
      state.budgetProposals.unshift(record);
      prependActivity(state, "Budget proposal added", `${record.title} entered the finance queue.`);
    }
    saveState(state);
    return record;
  }

  function deleteBudgetProposal(proposalId) {
    const state = getState();
    const proposal = state.budgetProposals.find((item) => item.id === proposalId);
    if (!proposal) throw new Error("Budget proposal not found.");
    state.budgetProposals = state.budgetProposals.filter((item) => item.id !== proposalId);
    prependActivity(state, "Budget proposal removed", `${proposal.title} was removed from finance review.`);
    saveState(state);
  }

  function upsertProcurementBill(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("bill"),
      departmentId: payload.departmentId,
      vendor: payload.vendor.trim(),
      workOrderId: payload.workOrderId || "",
      amountLakhs: Number(payload.amountLakhs),
      gstValid: payload.gstValid === true || payload.gstValid === "true",
      status: payload.status
    };
    if (payload.id) {
      state.procurementBills = state.procurementBills.map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Procurement bill updated", `${record.vendor} bill status was updated by CFO.`);
    } else {
      state.procurementBills.unshift(record);
      prependActivity(state, "Procurement bill added", `${record.vendor} bill entered verification.`);
    }
    saveState(state);
    return record;
  }

  function deleteProcurementBill(billId) {
    const state = getState();
    const bill = state.procurementBills.find((item) => item.id === billId);
    if (!bill) throw new Error("Procurement bill not found.");
    state.procurementBills = state.procurementBills.filter((item) => item.id !== billId);
    prependActivity(state, "Procurement bill removed", `${bill.vendor} bill was removed from finance review.`);
    saveState(state);
  }

  function upsertQcReview(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("qc"),
      departmentId: payload.departmentId,
      workOrderId: payload.workOrderId || "",
      title: payload.title.trim(),
      reviewer: payload.reviewer || "",
      finding: payload.finding.trim(),
      status: payload.status,
      score: Number(payload.score)
    };
    if (payload.id) {
      state.qcReviews = state.qcReviews.map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "QC review updated", `${record.title} was updated during quality review.`);
    } else {
      state.qcReviews.unshift(record);
      prependActivity(state, "QC review added", `${record.title} entered the QC queue.`);
    }
    saveState(state);
    return record;
  }

  function deleteQcReview(reviewId) {
    const state = getState();
    const review = state.qcReviews.find((item) => item.id === reviewId);
    if (!review) throw new Error("QC review not found.");
    state.qcReviews = state.qcReviews.filter((item) => item.id !== reviewId);
    prependActivity(state, "QC review removed", `${review.title} was removed from quality review.`);
    saveState(state);
  }

  /* ── Fund Releases ── */
  function upsertFundRelease(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("release"),
      departmentId: payload.departmentId,
      proposalId: payload.proposalId || "",
      title: payload.title.trim(),
      amountCr: Number(payload.amountCr),
      quarter: payload.quarter || "",
      status: payload.status,
      releasedAt: payload.status === "RELEASED" ? (payload.releasedAt || new Date().toISOString()) : null,
      notes: (payload.notes || "").trim()
    };
    if (payload.id) {
      state.fundReleases = (state.fundReleases || []).map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Fund release updated", `${record.title} was updated by CFO.`);
    } else {
      state.fundReleases = [record].concat(state.fundReleases || []);
      prependActivity(state, "Fund release created", `${record.title} entered the release queue.`);
    }
    saveState(state);
    return record;
  }

  function deleteFundRelease(releaseId) {
    const state = getState();
    const release = (state.fundReleases || []).find((item) => item.id === releaseId);
    if (!release) throw new Error("Fund release not found.");
    state.fundReleases = (state.fundReleases || []).filter((item) => item.id !== releaseId);
    prependActivity(state, "Fund release removed", `${release.title} was removed from the release schedule.`);
    saveState(state);
  }

  /* ── Maintenance Logs ── */
  function upsertMaintenanceLog(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("mlog"),
      departmentId: payload.departmentId,
      engineerId: payload.engineerId,
      scheduleId: payload.scheduleId || "",
      workOrderId: payload.workOrderId || "",
      title: payload.title.trim(),
      activity: (payload.activity || "").trim(),
      hoursSpent: Number(payload.hoursSpent) || 0,
      date: payload.date,
      status: payload.status
    };
    if (payload.id) {
      state.maintenanceLogs = (state.maintenanceLogs || []).map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Maintenance log updated", `${record.title} was updated by field engineer.`);
    } else {
      state.maintenanceLogs = [record].concat(state.maintenanceLogs || []);
      prependActivity(state, "Maintenance log added", `${record.title} was logged from the field.`);
    }
    saveState(state);
    return record;
  }

  function deleteMaintenanceLog(logId) {
    const state = getState();
    const log = (state.maintenanceLogs || []).find((item) => item.id === logId);
    if (!log) throw new Error("Maintenance log not found.");
    state.maintenanceLogs = (state.maintenanceLogs || []).filter((item) => item.id !== logId);
    prependActivity(state, "Maintenance log removed", `${log.title} was removed from field records.`);
    saveState(state);
  }

  /* ── Sensor Deployments ── */
  function upsertSensorDeployment(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("sensor"),
      departmentId: payload.departmentId,
      engineerId: payload.engineerId,
      workOrderId: payload.workOrderId || "",
      sensorType: payload.sensorType.trim(),
      assetLocation: payload.assetLocation.trim(),
      serialNo: (payload.serialNo || "").trim(),
      installedAt: payload.installedAt || new Date().toISOString(),
      status: payload.status,
      notes: (payload.notes || "").trim()
    };
    if (payload.id) {
      state.sensorDeployments = (state.sensorDeployments || []).map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Sensor deployment updated", `${record.sensorType} at ${record.assetLocation} was updated.`);
    } else {
      state.sensorDeployments = [record].concat(state.sensorDeployments || []);
      prependActivity(state, "Sensor deployed", `${record.sensorType} installed at ${record.assetLocation}.`);
    }
    saveState(state);
    return record;
  }

  function deleteSensorDeployment(sensorId) {
    const state = getState();
    const sensor = (state.sensorDeployments || []).find((item) => item.id === sensorId);
    if (!sensor) throw new Error("Sensor deployment not found.");
    state.sensorDeployments = (state.sensorDeployments || []).filter((item) => item.id !== sensorId);
    prependActivity(state, "Sensor removed", `${sensor.sensorType} deployment record was removed.`);
    saveState(state);
  }

  /* ── Task Material Logs ── */
  function upsertTaskMaterialLog(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("matlog"),
      departmentId: payload.departmentId,
      engineerId: payload.engineerId,
      workOrderId: payload.workOrderId || "",
      material: payload.material.trim(),
      quantity: payload.quantity.trim(),
      unit: (payload.unit || "").trim(),
      usedOn: payload.usedOn,
      notes: (payload.notes || "").trim()
    };
    if (payload.id) {
      state.taskMaterialLogs = (state.taskMaterialLogs || []).map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Material log updated", `${record.material} log was updated.`);
    } else {
      state.taskMaterialLogs = [record].concat(state.taskMaterialLogs || []);
      prependActivity(state, "Material logged", `${record.material} usage was recorded by field engineer.`);
    }
    saveState(state);
    return record;
  }

  function deleteTaskMaterialLog(logId) {
    const state = getState();
    const log = (state.taskMaterialLogs || []).find((item) => item.id === logId);
    if (!log) throw new Error("Material log not found.");
    state.taskMaterialLogs = (state.taskMaterialLogs || []).filter((item) => item.id !== logId);
    prependActivity(state, "Material log removed", `${log.material} log was removed.`);
    saveState(state);
  }

  /* ── Outcome / Accountability Reports ── */
  function upsertOutcomeReport(payload) {
    const state = getState();
    const record = {
      id: payload.id || createId("outcome"),
      departmentId: payload.departmentId,
      workOrderId: payload.workOrderId || "",
      preparedBy: payload.preparedBy || "",
      title: payload.title.trim(),
      summary: (payload.summary || "").trim(),
      budgetSanctioned: Number(payload.budgetSanctioned) || 0,
      budgetUsed: Number(payload.budgetUsed) || 0,
      outcome: payload.outcome || "PENDING",
      lessonsLearned: (payload.lessonsLearned || "").trim(),
      submittedAt: payload.submittedAt || new Date().toISOString()
    };
    if (payload.id) {
      state.outcomeReports = (state.outcomeReports || []).map((item) => (item.id === payload.id ? record : item));
      prependActivity(state, "Outcome report updated", `${record.title} was updated by the officer.`);
    } else {
      state.outcomeReports = [record].concat(state.outcomeReports || []);
      prependActivity(state, "Outcome report submitted", `${record.title} was submitted for review.`);
    }
    saveState(state);
    return record;
  }

  function deleteOutcomeReport(reportId) {
    const state = getState();
    const report = (state.outcomeReports || []).find((item) => item.id === reportId);
    if (!report) throw new Error("Outcome report not found.");
    state.outcomeReports = (state.outcomeReports || []).filter((item) => item.id !== reportId);
    prependActivity(state, "Outcome report removed", `${report.title} was removed from records.`);
    saveState(state);
  }

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
