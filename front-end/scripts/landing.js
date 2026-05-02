(function bootstrapLanding(globalScope) {
  const {
    REQUEST_STATUS_STEPS,
    findRequestByReference,
    formatDisplayDate,
    formatStatus,
    getCategoryById,
    getDepartmentById,
    getLanguage,
    getSession,
    getState,
    initializeStore,
    submitCitizenRequest
  } = globalScope.CRIMS.store;
  const { applyTranslations, bindLanguageSelector, localizeCategory, localizeDepartmentPublicLabel, localizeStatus, t } =
    globalScope.CRIMS.i18n;
  const { getRequestFormError } = globalScope.CRIMS.validators;

  const heroTrustData = [
    { value: "24/7", labelKey: "landing.heroTrustIntakeLabel", detailKey: "landing.heroTrustIntakeDetail" },
    { value: "3-stage", labelKey: "landing.heroTrustBudgetLabel", detailKey: "landing.heroTrustBudgetDetail" },
    { value: "GST + quotes", labelKey: "landing.heroTrustProcurementLabel", detailKey: "landing.heroTrustProcurementDetail" },
    { value: "QC required", labelKey: "landing.heroTrustClosureLabel", detailKey: "landing.heroTrustClosureDetail" }
  ];

  const WORKFLOW_CARD_COPY = {
    en: [
      { step: "01", title: "Raise", copy: "Share the problem or improvement needed, along with location and contact details." },
      { step: "02", title: "Acknowledge", copy: "The portal gives a reference number right away so the request can be tracked." },
      { step: "03", title: "Review & plan", copy: "Officials check urgency, practicality, and what work or budget is required." },
      { step: "04", title: "Approve & execute", copy: "After checks and approvals, the work is assigned and carried out on the ground." },
      { step: "05", title: "Verify & close", copy: "Quality checks happen before the case is marked completed for the public record." }
    ],
    hi: [
      { step: "01", title: "समस्या बताएं", copy: "समस्या या सुधार की जरूरत लिखें। स्थान और संपर्क जानकारी भी दें।" },
      { step: "02", title: "रसीद मिलेगी", copy: "अनुरोध जमा होते ही एक संदर्भ संख्या मिलती है, जिससे आगे स्थिति देखी जा सकती है।" },
      { step: "03", title: "जांच और योजना", copy: "अधिकारी देखते हैं कि मामला कितना जरूरी है, क्या काम करना है और कितनी तैयारी चाहिए।" },
      { step: "04", title: "मंजूरी और काम", copy: "जांच पूरी होने के बाद काम स्वीकृत होता है और टीम मौके पर काम शुरू करती है।" },
      { step: "05", title: "पुष्टि और बंद", copy: "काम पूरा होने के बाद गुणवत्ता जांच होती है, फिर ही अनुरोध बंद किया जाता है।" }
    ],
    te: [
      { step: "01", title: "సమస్య చెప్పండి", copy: "ఏ సమస్య ఉందో లేదా ఏ మార్పు కావాలో రాయండి. చోటు మరియు సంప్రదింపు వివరాలు కూడా ఇవ్వండి." },
      { step: "02", title: "రెఫరెన్స్ వస్తుంది", copy: "అభ్యర్థన పంపిన వెంటనే ఒక రిఫరెన్స్ నంబర్ వస్తుంది. దాని ద్వారా తర్వాత స్థితి చూడవచ్చు." },
      { step: "03", title: "పరిశీలన మరియు ప్లాన్", copy: "అధికారులు ఇది ఎంత అత్యవసరమో, ఏ పని కావాలో, ఎంత సన్నాహకం అవసరమో చూస్తారు." },
      { step: "04", title: "ఆమోదం మరియు పని", copy: "పరిశీలన పూర్తైన తర్వాత పని ఆమోదం పొంది, బృందం ప్రదేశంలో పని ప్రారంభిస్తుంది." },
      { step: "05", title: "నిర్ధారణ మరియు ముగింపు", copy: "పని పూర్తయ్యాక నాణ్యత తనిఖీ జరుగుతుంది. తరువాతే అభ్యర్థనను ముగిస్తారు." }
    ]
  };

  const ASSURANCE_CARD_COPY = {
    en: [
      {
        label: "Traceable requests",
        title: "Each issue gets a public reference number",
        copy: "Every complaint or request gets its own trackable number, so citizens do not have to depend on personal follow-up."
      },
      {
        label: "Budget scrutiny",
        title: "Money moves only after checks",
        copy: "Estimates, approvals, and finance review help make spending more disciplined and visible."
      },
      {
        label: "Procurement checks",
        title: "Purchases need supporting proof",
        copy: "Quotations and bill checks reduce random buying and make approvals more accountable."
      },
      {
        label: "Independent closure",
        title: "Completion is checked before closure",
        copy: "A case is not closed casually. Work is reviewed before it is shown as complete."
      }
    ],
    hi: [
      {
        label: "ट्रैक होने वाला अनुरोध",
        title: "हर शिकायत को नंबर मिलता है",
        copy: "हर अनुरोध के लिए एक सार्वजनिक संदर्भ संख्या बनती है, इसलिए बार-बार व्यक्तिगत रूप से पूछने की जरूरत नहीं रहती।"
      },
      {
        label: "वित्तीय जांच",
        title: "जांच के बाद ही पैसा आगे बढ़ता है",
        copy: "अनुमान, अधिकारी की मंजूरी और वित्त समीक्षा के बाद ही खर्च आगे बढ़ता है।"
      },
      {
        label: "खरीद पर नियंत्रण",
        title: "बिल और कोटेशन जरूरी हैं",
        copy: "खरीद से पहले प्रमाण रहने से मनमानी कम होती है और जिम्मेदारी बढ़ती है।"
      },
      {
        label: "अलग से सत्यापन",
        title: "पूरा काम जांच के बाद ही बंद होता है",
        copy: "सिर्फ कह देने से काम पूरा नहीं माना जाता। पहले जांच होती है, फिर मामला बंद होता है।"
      }
    ],
    te: [
      {
        label: "ట్రాక్ చేయగల అభ్యర్థన",
        title: "ప్రతి ఫిర్యాదుకి ఒక నంబర్ ఉంటుంది",
        copy: "ప్రతి అభ్యర్థనకు ఒక పబ్లిక్ రిఫరెన్స్ నంబర్ వస్తుంది. అందువల్ల వ్యక్తిగతంగా తిరిగి తిరిగి అడగాల్సిన అవసరం తగ్గుతుంది."
      },
      {
        label: "ఆర్థిక తనిఖీ",
        title: "చెక్ అయిన తర్వాతే నిధులు కదులుతాయి",
        copy: "అంచనా, అధికారుల ఆమోదం, ఫైనాన్స్ పరిశీలన తర్వాతే ఖర్చు ముందుకు వెళ్తుంది."
      },
      {
        label: "కొనుగోలు నియంత్రణ",
        title: "బిల్ మరియు కోటేషన్ తప్పనిసరి",
        copy: "కొనుగోలు ముందు ఆధారాలు ఉండటం వల్ల యాదృచ్ఛిక ఖర్చులు తగ్గి బాధ్యత పెరుగుతుంది."
      },
      {
        label: "వేరుగా తనిఖీ",
        title: "పని పూర్తైందని చూపించే ముందు పరీక్ష ఉంటుంది",
        copy: "ఎవరైనా పూర్తైందని చెప్పడం సరిపోదు. పని నిజంగా పూర్తైందో చూసిన తరువాతే కేసు మూసివేస్తారు."
      }
    ]
  };

  const PUBLIC_STATS_TRANSLATIONS = {
    "road corridors upgraded": {
      te: "\u0c05\u0c2a\u0c4d\u200c\u0c17\u0c4d\u0c30\u0c47\u0c21\u0c4d \u0c1a\u0c47\u0c38\u0c3f\u0c28 \u0c30\u0c39\u0c26\u0c3e\u0c30\u0c3f \u0c15\u0c3e\u0c30\u0c3f\u0c21\u0c3e\u0c30\u0c4d\u0c32\u0c41",
      hi: "\u0909\u0928\u094d\u0928\u0924 \u0915\u093f\u090f \u0917\u090f \u0938\u0921\u093c\u0915 \u0915\u0949\u0930\u093f\u0921\u094b\u0930"
    },
    "Road resurfacing and safer commuter stretches": {
      te: "\u0c30\u0c39\u0c26\u0c3e\u0c30\u0c41\u0c32 \u0c30\u0c40\u0c38\u0c30\u0c4d\u0c2b\u0c47\u0c38\u0c3f\u0c02\u0c17\u0c4d \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c2d\u0c26\u0c4d\u0c30\u0c2e\u0c48\u0c28 \u0c2a\u0c4d\u0c30\u0c2f\u0c3e\u0c23 \u0c2e\u0c3e\u0c30\u0c4d\u0c17\u0c3e\u0c32\u0c41",
      hi: "\u0938\u0921\u093c\u0915 \u0930\u0940\u0938\u0930\u094d\u092b\u0947\u0938\u093f\u0902\u0917 \u0914\u0930 \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u092f\u093e\u0924\u094d\u0930\u093e \u092e\u093e\u0930\u094d\u0917"
    },
    "water reliability": {
      te: "\u0c28\u0c40\u0c1f\u0c3f \u0c35\u0c3f\u0c36\u0c4d\u0c35\u0c38\u0c28\u0c40\u0c2f\u0c24",
      hi: "\u091c\u0932 \u0935\u093f\u0936\u094d\u0935\u0938\u0928\u0940\u092f\u0924\u093e"
    },
    "Service continuity across priority zones": {
      te: "\u0c2a\u0c4d\u0c30\u0c3e\u0c27\u0c3e\u0c28\u0c4d\u0c2f \u0c2a\u0c4d\u0c30\u0c3e\u0c02\u0c24\u0c3e\u0c32\u0c32\u0c4b \u0c38\u0c47\u0c35\u0c32 \u0c28\u0c3f\u0c30\u0c02\u0c24\u0c30\u0c24",
      hi: "\u092a\u094d\u0930\u093e\u0925\u092e\u093f\u0915 \u0915\u094d\u0937\u0947\u0924\u094d\u0930\u094b\u0902 \u092e\u0947\u0902 \u0938\u0947\u0935\u093e \u0928\u093f\u0930\u0902\u0924\u0930\u0924\u093e"
    },
    "smart assets monitored": {
      te: "\u0c2a\u0c30\u0c4d\u0c2f\u0c35\u0c47\u0c15\u0c4d\u0c37\u0c3f\u0c02\u0c1a\u0c2c\u0c21\u0c41\u0c24\u0c41\u0c28\u0c4d\u0c28 \u0c38\u0c4d\u0c2e\u0c3e\u0c30\u0c4d\u0c1f\u0c4d \u0c06\u0c38\u0c4d\u0c24\u0c41\u0c32\u0c41",
      hi: "\u0928\u093f\u0917\u0930\u093e\u0928\u0940 \u092e\u0947\u0902 \u0938\u094d\u092e\u093e\u0930\u094d\u091f \u0905\u0938\u0947\u091f"
    },
    "Sensors and connected field infrastructure": {
      te: "\u0c38\u0c46\u0c28\u0c4d\u0c38\u0c30\u0c4d\u0c32\u0c41 \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c05\u0c28\u0c41\u0c38\u0c02\u0c27\u0c3e\u0c28\u0c2e\u0c48\u0c28 \u0c2b\u0c40\u0c32\u0c4d\u0c21\u0c4d \u0c05\u0c35\u0c38\u0c30\u0c38\u0c66\u0c30\u0c3e",
      hi: "\u0938\u0947\u0902\u0938\u0930 \u0914\u0930 \u091c\u0941\u0921\u093c\u0940 \u0939\u0941\u0908 \u092b\u0940\u0932\u094d\u0921 \u0905\u0935\u0938\u0902\u0930\u091a\u0928\u093e"
    },
    "green infrastructure sites": {
      te: "\u0c39\u0c30\u0c3f\u0c24 \u0c05\u0c35\u0c38\u0c30\u0c38\u0c66\u0c30 \u0c38\u0c48\u0c1f\u0c4d\u0c32\u0c41",
      hi: "\u0939\u0930\u093f\u0924 \u0905\u0935\u0938\u0902\u0930\u091a\u0928\u093e \u0938\u094d\u0925\u0932"
    },
    "Parks, buffers, and resilient civic edges": {
      te: "\u0c2a\u0c3e\u0c30\u0c4d\u0c15\u0c4d\u0c32\u0c41, \u0c2c\u0c2b\u0c30\u0c4d\u0c32\u0c41 \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c38\u0c39\u0c28\u0c36\u0c40\u0c32 \u0c2a\u0c4c\u0c30 \u0c05\u0c02\u0c1a\u0c41\u0c32\u0c41",
      hi: "\u092a\u093e\u0930\u094d\u0915, \u092c\u092b\u0930 \u0914\u0930 \u0932\u091a\u0940\u0932\u0947 \u0928\u093e\u0917\u0930\u093f\u0915 \u0915\u093f\u0928\u093e\u0930\u0947"
    }
  };

  const IMPACT_STORY_TRANSLATIONS = {
    "Completed road upgrades": {
      te: "\u0c2a\u0c42\u0c30\u0c4d\u0c24\u0c3f \u0c05\u0c2f\u0c3f\u0c28 \u0c30\u0c39\u0c26\u0c3e\u0c30\u0c3f \u0c05\u0c2a\u0c4d\u200c\u0c17\u0c4d\u0c30\u0c47\u0c21\u0c4d\u0c32\u0c41",
      hi: "\u092a\u0942\u0930\u094d\u0923 \u0939\u0941\u090f \u0938\u0921\u093c\u0915 \u0909\u0928\u094d\u0928\u092f\u0928"
    },
    "High-use roads and access corridors have been resurfaced to improve safety, freight movement, and daily commute quality.": {
      te: "\u0c2d\u0c26\u0c4d\u0c30\u0c24, \u0c38\u0c30\u0c15\u0c41 \u0c30\u0c35\u0c3e\u0c23\u0c3e \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c30\u0c4b\u0c1c\u0c41\u0c35\u0c3e\u0c30\u0c40 \u0c2a\u0c4d\u0c30\u0c2f\u0c3e\u0c23 \u0c28\u0c3e\u0c23\u0c4d\u0c2f\u0c24\u0c28\u0c41 \u0c2e\u0c46\u0c30\u0c41\u0c17\u0c41\u0c2a\u0c30\u0c1a\u0c21\u0c3e\u0c28\u0c3f\u0c15\u0c3f \u0c05\u0c27\u0c3f\u0c15 \u0c35\u0c3e\u0c21\u0c15\u0c02 \u0c09\u0c28\u0c4d\u0c28 \u0c30\u0c39\u0c26\u0c3e\u0c30\u0c41\u0c32\u0c41 \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c2a\u0c4d\u0c30\u0c35\u0c47\u0c36 \u0c15\u0c3e\u0c30\u0c3f\u0c21\u0c3e\u0c30\u0c4d\u0c32\u0c28\u0c41 \u0c30\u0c40\u0c38\u0c30\u0c4d\u0c2b\u0c47\u0c38\u0c4d \u0c1a\u0c47\u0c38\u0c3e\u0c30\u0c41.",
      hi: "\u0938\u0941\u0930\u0915\u094d\u0937\u093e, \u092e\u093e\u0932 \u0922\u0941\u0932\u093e\u0908 \u0914\u0930 \u0926\u0948\u0928\u093f\u0915 \u092f\u093e\u0924\u094d\u0930\u093e \u0915\u0940 \u0917\u0941\u0923\u0935\u0924\u094d\u0924\u093e \u092c\u0947\u0939\u0924\u0930 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0905\u0927\u093f\u0915 \u0909\u092a\u092f\u094b\u0917 \u0935\u093e\u0932\u0940 \u0938\u0921\u093c\u0915\u094b\u0902 \u0914\u0930 \u092a\u0939\u0941\u0902\u091a \u0915\u0949\u0930\u093f\u0921\u094b\u0930\u094d\u0938 \u0915\u0940 \u0928\u0908 \u0938\u0924\u0939 \u0924\u0948\u092f\u093e\u0930 \u0915\u0940 \u0917\u0908 \u0939\u0948\u0964"
    },
    "Green infrastructure": {
      te: "\u0c39\u0c30\u0c3f\u0c24 \u0c05\u0c35\u0c38\u0c30\u0c38\u0c66\u0c30\u0c3e",
      hi: "\u0939\u0930\u093f\u0924 \u0905\u0935\u0938\u0902\u0930\u091a\u0928\u093e"
    },
    "Urban edges, shaded corridors, and stormwater-friendly landscapes are being expanded to support a healthier public realm.": {
      te: "\u0c06\u0c30\u0c4b\u0c17\u0c4d\u0c2f\u0c15\u0c30\u0c2e\u0c48\u0c28 \u0c2a\u0c4d\u0c30\u0c1c\u0c3e \u0c2a\u0c30\u0c3f\u0c38\u0c30\u0c3e\u0c28\u0c4d\u0c28\u0c3f \u0c2c\u0c32\u0c2a\u0c30\u0c1a\u0c21\u0c3e\u0c28\u0c3f\u0c15\u0c3f \u0c28\u0c17\u0c30 \u0c05\u0c02\u0c1a\u0c41\u0c32\u0c41, \u0c28\u0c40\u0c21\u0c3f\u0c1a\u0c4d\u0c1a\u0c47 \u0c15\u0c3e\u0c30\u0c3f\u0c21\u0c3e\u0c30\u0c4d\u0c32\u0c41 \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c35\u0c30\u0c4d\u0c37\u0c82 \u0c28\u0c40\u0c30\u0c41\u0c15\u0c41 \u0c05\u0c28\u0c41\u0c15\u0c42\u0c32\u0c2e\u0c48\u0c28 \u0c2d\u0c42\u0c26\u0c43\u0c36\u0c4d\u0c2f\u0c3e\u0c32\u0c28\u0c41 \u0c35\u0c3f\u0c38\u0c4d\u0c24\u0c30\u0c3f\u0c82\u0c1a\u0c3e\u0c30\u0c41.",
      hi: "\u0905\u0927\u093f\u0915 \u0938\u094d\u0935\u0938\u094d\u0925 \u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u092a\u0930\u093f\u0935\u0947\u0936 \u0915\u0947 \u0932\u093f\u090f \u0936\u0939\u0930\u0940 \u0915\u093f\u0928\u093e\u0930\u094b\u0902, \u091b\u093e\u092f\u093e\u0926\u093e\u0930 \u0915\u0949\u0930\u093f\u0921\u094b\u0930\u094d\u0938 \u0914\u0930 \u0935\u0930\u094d\u0937\u093e-\u0905\u0928\u0941\u0915\u0942\u0932 \u092a\u0930\u093f\u0926\u0943\u0936\u094d\u092f\u094b\u0902 \u0915\u093e \u0935\u093f\u0938\u094d\u0924\u093e\u0930 \u0915\u093f\u092f\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948\u0964"
    },
    "Water reliability": {
      te: "\u0c28\u0c40\u0c1f\u0c3f \u0c35\u0c3f\u0c36\u0c4d\u0c35\u0c38\u0c28\u0c40\u0c2f\u0c24",
      hi: "\u091c\u0932 \u0935\u093f\u0936\u094d\u0935\u0938\u0928\u0940\u092f\u0924\u093e"
    },
    "Teams monitor service continuity and act on leaks and pressure issues faster through coordinated field and administrative workflows.": {
      te: "\u0c38\u0c2e\u0c28\u0c4d\u0c35\u0c2f \u0c2b\u0c40\u0c32\u0c4d\u0c21\u0c4d \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c2a\u0c30\u0c3f\u0c2a\u0c3e\u0c32\u0c28 \u0c35\u0c30\u0c4d\u0c15\u0c4d\u200c\u0c2b\u0c4d\u0c32\u0c4b\u0c32\u0c26\u0c4d\u0c35\u0c3e\u0c30\u0c3e \u0c1c\u0c1f\u0c4d\u0c1f\u0c41\u0c32\u0c41 \u0c38\u0c47\u0c35\u0c32 \u0c28\u0c3f\u0c30\u0c02\u0c24\u0c30\u0c24\u0c28\u0c41 \u0c2a\u0c30\u0c4d\u0c2f\u0c35\u0c47\u0c15\u0c4d\u0c37\u0c3f\u0c02\u0c1a\u0c3f, \u0c32\u0c40\u0c15\u0c47\u0c1c\u0c40\u0c32\u0c41 \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c2a\u0c40\u0c21\u0c28 \u0c38\u0c2e\u0c38\u0c4d\u0c2f\u0c32\u0c2a\u0c48 \u0c35\u0c47\u0c17\u0c02\u0c17\u0c3e \u0c1a\u0c30\u0c4d\u0c2f \u0c24\u0c40\u0c38\u0c41\u0c15\u0c41\u0c02\u0c1f\u0c3e\u0c2f\u0c3f.",
      hi: "\u0938\u092e\u0928\u094d\u0935\u093f\u0924 \u092b\u0940\u0932\u094d\u0921 \u0914\u0930 \u092a\u094d\u0930\u0936\u093e\u0938\u0928\u093f\u0915 \u0935\u0930\u094d\u0915\u092b\u094d\u0932\u094b \u0915\u0947 \u092e\u093e\u0927\u094d\u092f\u092e \u0938\u0947 \u091f\u0940\u092e\u0947\u0902 \u0938\u0947\u0935\u093e \u0928\u093f\u0930\u0902\u0924\u0930\u0924\u093e \u0915\u0940 \u0928\u093f\u0917\u0930\u093e\u0928\u0940 \u0915\u0930\u0924\u0940 \u0939\u0948\u0902 \u0914\u0930 \u0930\u093f\u0938\u093e\u0935 \u0935 \u0926\u092c\u093e\u0935 \u0938\u092e\u0938\u094d\u092f\u093e\u0913\u0902 \u092a\u0930 \u0924\u0947\u091c\u0940 \u0938\u0947 \u0915\u093e\u0930\u094d\u0930\u0935\u093e\u0908 \u0915\u0930\u0924\u0940 \u0939\u0948\u0902\u0964"
    },
    "Smart monitoring": {
      te: "\u0c38\u0c4d\u0c2e\u0c3e\u0c30\u0c4d\u0c1f\u0c4d \u0c2a\u0c30\u0c4d\u0c2f\u0c35\u0c47\u0c15\u0c4d\u0c37\u0c23",
      hi: "\u0938\u094d\u092e\u093e\u0930\u094d\u091f \u0928\u093f\u0917\u0930\u093e\u0928\u0940"
    },
    "Sensors and structured reviews help the city detect risk early, prioritize work orders, and close issues with better accountability.": {
      te: "\u0c38\u0c46\u0c28\u0c4d\u0c38\u0c30\u0c4d\u0c32\u0c41 \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c15\u0c4d\u0c30\u0c2e\u0c2c\u0c26\u0c4d\u0c27 \u0c38\u0c2e\u0c40\u0c15\u0c4d\u0c37\u0c32\u0c41 \u0c2a\u0c1f\u0c4d\u0c1f\u0c23\u0c3e\u0c28\u0c3f\u0c15\u0c3f \u0c2e\u0c41\u0c02\u0c26\u0c41\u0c17\u0c3e \u0c2a\u0c4d\u0c30\u0c2e\u0c3e\u0c26\u0c3e\u0c32\u0c28\u0c41 \u0c17\u0c41\u0c30\u0c4d\u0c24\u0c3f\u0c02\u0c1a\u0c21\u0c3e\u0c28\u0c3f\u0c15\u0c3f, \u0c35\u0c30\u0c4d\u0c15\u0c4d \u0c06\u0c30\u0c4d\u0c21\u0c30\u0c4d\u0c32\u0c15\u0c41 \u0c2a\u0c4d\u0c30\u0c3e\u0c27\u0c3e\u0c28\u0c4d\u0c2f \u0c07\u0c35\u0c4d\u0c35\u0c21\u0c3e\u0c28\u0c3f\u0c15\u0c3f \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c2e\u0c30\u0c3f\u0c02\u0c24 \u0c2c\u0c3e\u0c27\u0c4d\u0c2f\u0c24\u0c24\u0c4b \u0c38\u0c2e\u0c38\u0c4d\u0c2f\u0c32\u0c28\u0c41 \u0c2e\u0c41\u0c17\u0c3f\u0c02\u0c1a\u0c21\u0c3e\u0c28\u0c3f\u0c15\u0c3f \u0c38\u0c39\u0c3e\u0c2f\u0c2a\u0c21\u0c24\u0c3e\u0c2f\u0c3f.",
      hi: "\u0938\u0947\u0902\u0938\u0930 \u0914\u0930 \u0938\u0902\u0930\u091a\u093f\u0924 \u0938\u092e\u0940\u0915\u094d\u0937\u093e\u090f\u0901 \u0936\u0939\u0930 \u0915\u094b \u091c\u094b\u0916\u093f\u092e \u0915\u0940 \u092a\u0939\u091a\u093e\u0928 \u0936\u0941\u0930\u0942\u0906\u0924\u0940 \u0938\u094d\u0924\u0930 \u092a\u0930 \u0915\u0930\u0928\u0947, \u0935\u0930\u094d\u0915 \u0911\u0930\u094d\u0921\u0930\u094d\u0938 \u0915\u094b \u092a\u094d\u0930\u093e\u0925\u092e\u093f\u0915\u0924\u093e \u0926\u0947\u0928\u0947 \u0914\u0930 \u092c\u0947\u0939\u0924\u0930 \u091c\u0935\u093e\u092c\u0926\u0947\u0939\u0940 \u0915\u0947 \u0938\u093e\u0925 \u092e\u093e\u092e\u0932\u0947 \u092c\u0902\u0926 \u0915\u0930\u0928\u0947 \u092e\u0947\u0902 \u092e\u0926\u0926 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902\u0964"
    }
  };

  function localizeDynamicText(value, language) {
    return (PUBLIC_STATS_TRANSLATIONS[value] && PUBLIC_STATS_TRANSLATIONS[value][language]) || value;
  }

  function localizeImpactText(value, language) {
    return (IMPACT_STORY_TRANSLATIONS[value] && IMPACT_STORY_TRANSLATIONS[value][language]) || value;
  }

  let currentAcknowledgement = null;
  let currentTrackedRequest = null;

  const elements = {
    languageSelect: document.querySelector("#language-select"),
    heroPrideCards: document.querySelector("#city-pride-cards"),
    heroTrustGrid: document.querySelector("#hero-trust-grid"),
    statsGrid: document.querySelector("#public-stats-grid"),
    impactGrid: document.querySelector("#impact-grid"),
    requestForm: document.querySelector("#request-form"),
    requestError: document.querySelector("#request-error"),
    requestTypeSelect: document.querySelector("#request-type-select"),
    categorySelect: document.querySelector("#category-select"),
    urgencySelect: document.querySelector("#urgency-select"),
    ackCard: document.querySelector("#request-ack-card"),
    ackReference: document.querySelector("#ack-reference"),
    ackStatus: document.querySelector("#ack-status"),
    ackNextStep: document.querySelector("#ack-next-step"),
    trackingForm: document.querySelector("#tracking-form"),
    trackingError: document.querySelector("#tracking-error"),
    trackingResult: document.querySelector("#tracking-result"),
    trackingReference: document.querySelector("#tracking-reference"),
    trackingTitle: document.querySelector("#tracking-title"),
    trackingDepartment: document.querySelector("#tracking-department"),
    trackingLocation: document.querySelector("#tracking-location"),
    trackingDate: document.querySelector("#tracking-date"),
    trackingStatusPill: document.querySelector("#tracking-status-pill"),
    trackingSteps: document.querySelector("#tracking-steps"),
    workflowStrip: document.querySelector(".workflow-strip"),
    assuranceGrid: document.querySelector(".assurance-grid")
  };

  function renderStaticText() {
    const languageLabel = document.querySelector('label[for="language-select"] span');
    if (languageLabel) {
      languageLabel.textContent = t("common.language");
    }

    const workflowMiniCopy = document.querySelector(".hero-side-card .muted");
    if (workflowMiniCopy) {
      workflowMiniCopy.textContent = t("landing.workflowMiniCopy");
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getNextPublicStep(status) {
    if (status === "UNDER_REVIEW") {
      return "Feasibility review";
    }

    if (status === "APPROVED_FOR_PLANNING") {
      return "Department planning";
    }

    if (status === "CONVERTED_TO_WORK_ORDER") {
      return "Field execution";
    }

    if (status === "CLOSED") {
      return "Public closure";
    }

    if (status === "REJECTED") {
      return "Review complete";
    }

    return "Department routing";
  }

  function renderHeroPrideCards() {
    const requests = getState()
      .requests
      .slice()
      .sort((left, right) => new Date(right.receivedAt) - new Date(left.receivedAt))
      .slice(0, 2);

    elements.heroPrideCards.innerHTML = requests
      .map((request) => {
        const department = getDepartmentById(request.departmentId);
        const category = getCategoryById(request.categoryId);
        const statusClass = statusTone(request.status);

        return `
          <article class="city-pride-card">
            <div class="city-pride-head">
              <span class="field-label">${escapeHtml(request.requestType)}</span>
              <span class="status-pill ${statusClass}">${escapeHtml(localizeStatus(request.status))}</span>
            </div>
            <h4>${escapeHtml(request.title)}</h4>
            <p class="mono">${escapeHtml(request.publicReferenceNo)}</p>
            <div class="city-pride-meta">
              <span>${escapeHtml((department && localizeDepartmentPublicLabel(department)) || "Routing")}</span>
              <span>${escapeHtml((category && localizeCategory(category)) || "Civic service")}</span>
            </div>
            <div class="city-pride-next">
              <span>${escapeHtml(t("request.nextStep"))}</span>
              <strong>${escapeHtml(getNextPublicStep(request.status))}</strong>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderHeroTrustPanel() {
    if (!elements.heroTrustGrid) {
      return;
    }

    elements.heroTrustGrid.innerHTML = heroTrustData
      .map((item) => {
        const label = t(item.labelKey);
        const detail = t(item.detailKey);
        return `
          <div class="hero-trust-box">
            <span class="field-label">${escapeHtml(label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <p>${escapeHtml(detail)}</p>
          </div>
        `;
      })
      .join("");
  }

  function renderWorkflowCards() {
    const language = getLanguage();
    const cards = WORKFLOW_CARD_COPY[language] || WORKFLOW_CARD_COPY.en;

    elements.workflowStrip.innerHTML = cards
      .map((item) => {
        return `
          <article class="glass-card workflow-card">
            <span class="step">${item.step}</span>
            <h3>${item.title}</h3>
            <p>${item.copy}</p>
          </article>
        `;
      })
      .join("");
  }

  function renderAssuranceCards() {
    const language = getLanguage();
    const cards = ASSURANCE_CARD_COPY[language] || ASSURANCE_CARD_COPY.en;

    elements.assuranceGrid.innerHTML = cards
      .map((item) => {
        return `
          <article class="glass-card assurance-card">
            <span class="field-label">${item.label}</span>
            <h3>${item.title}</h3>
            <p>${item.copy}</p>
          </article>
        `;
      })
      .join("");
  }

  function renderStatsGrid() {
    const publicStats = getState().publicStats;
    const language = getLanguage();
    elements.statsGrid.innerHTML = publicStats
      .map((item) => {
        return `
          <article class="glass-card stat-card">
            <span class="field-label">${localizeDynamicText(item.label, language)}</span>
            <strong data-count-value="${item.value}">0</strong>
            <p>${localizeDynamicText(item.detail, language)}</p>
          </article>
        `;
      })
      .join("");
    animateCountUp(elements.statsGrid);
  }

  function getCountParts(value) {
    const match = String(value).trim().match(/^(\d+(?:\.\d+)?)(.*)$/);
    if (!match) {
      return null;
    }

    return {
      target: Number(match[1]),
      decimals: match[1].includes(".") ? match[1].split(".")[1].length : 0,
      suffix: match[2]
    };
  }

  function animateCountUp(root) {
    if (!root) {
      return;
    }

    const counters = root.querySelectorAll("[data-count-value]");
    const reduceMotion = globalScope.matchMedia && globalScope.matchMedia("(prefers-reduced-motion: reduce)").matches;

    counters.forEach((counter) => {
      const finalValue = counter.dataset.countValue;
      const parts = getCountParts(finalValue);

      if (!parts || reduceMotion) {
        counter.textContent = finalValue;
        return;
      }

      const start = performance.now();
      const duration = 3200;

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = parts.target * eased;
        counter.textContent = `${current.toFixed(parts.decimals)}${parts.suffix}`;

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          counter.textContent = finalValue;
        }
      }

      requestAnimationFrame(tick);
    });
  }

  function renderImpactGrid() {
    const impactStories = getState().impactStories;
    const language = getLanguage();
    elements.impactGrid.innerHTML = impactStories
      .map((story) => {
        return `
          <article class="glass-card impact-card">
            <h3>${localizeImpactText(story.title, language)}</h3>
            <p>${localizeImpactText(story.copy, language)}</p>
          </article>
        `;
      })
      .join("");
  }

  function renderLocalizedOptions() {
    const currentType = elements.requestTypeSelect.value;
    const currentUrgency = elements.urgencySelect.value;
    const currentCategory = elements.categorySelect.value;

    elements.requestTypeSelect.innerHTML = [
      `<option value="">${t("request.typeLabel")}</option>`,
      `<option value="Complaint">${t("request.typeComplaint")}</option>`,
      `<option value="Improvement">${t("request.typeImprovement")}</option>`
    ].join("");

    const serviceCategories = getState().serviceCategories;
    elements.categorySelect.innerHTML = [
      `<option value="">${t("request.categoryLabel")}</option>`,
      ...serviceCategories.map((category) => {
        return `<option value="${category.id}">${localizeCategory(category, getLanguage())}</option>`;
      })
    ].join("");

    elements.urgencySelect.innerHTML = [
      `<option value="">${t("request.urgencyLabel")}</option>`,
      `<option value="LOW">${t("request.urgencyLow")}</option>`,
      `<option value="MEDIUM">${t("request.urgencyMedium")}</option>`,
      `<option value="HIGH">${t("request.urgencyHigh")}</option>`,
      `<option value="EMERGENCY">${t("request.urgencyEmergency")}</option>`
    ].join("");

    elements.requestTypeSelect.value = currentType;
    elements.categorySelect.value = currentCategory;
    elements.urgencySelect.value = currentUrgency;
  }

  function renderAcknowledgement(requestRecord) {
    currentAcknowledgement = requestRecord;
    elements.ackReference.textContent = requestRecord.publicReferenceNo;
    elements.ackStatus.textContent = localizeStatus(requestRecord.status, getLanguage());
    elements.ackNextStep.textContent = t("request.nextStepValue");
    elements.ackCard.classList.remove("hidden");
  }

  function statusTone(status) {
    switch (status) {
      case "UNDER_REVIEW":
        return "warning";
      case "REJECTED":
        return "alert";
      case "RECEIVED":
        return "neutral";
      default:
        return "";
    }
  }

  function renderTrackingSteps(status) {
    const steps = REQUEST_STATUS_STEPS.map((step) => {
      const className = step === status ? "status-step current" : "status-step";
      return `<span class="${className}">${localizeStatus(step, getLanguage())}</span>`;
    }).join("");

    elements.trackingSteps.innerHTML = steps;
  }

  function renderTrackingResult(requestRecord) {
    currentTrackedRequest = requestRecord;
    const department = getDepartmentById(requestRecord.departmentId);
    const tone = statusTone(requestRecord.status);

    elements.trackingReference.textContent = requestRecord.publicReferenceNo;
    elements.trackingTitle.textContent = requestRecord.title;
    elements.trackingDepartment.textContent =
      (department && localizeDepartmentPublicLabel(department, getLanguage())) || "Assigned department";
    elements.trackingLocation.textContent = requestRecord.locationText;
    elements.trackingDate.textContent = formatDisplayDate(requestRecord.receivedAt);
    elements.trackingStatusPill.textContent = localizeStatus(requestRecord.status, getLanguage());
    elements.trackingStatusPill.className = `status-pill ${tone}`.trim();
    renderTrackingSteps(requestRecord.status);

    elements.trackingResult.classList.remove("hidden");
  }

  function showRequestError(message) {
    if (!message) {
      elements.requestError.textContent = "";
      elements.requestError.classList.add("hidden");
      return;
    }

    elements.requestError.textContent = message;
    elements.requestError.classList.remove("hidden");
  }

  function showTrackingError(message) {
    if (!message) {
      elements.trackingError.textContent = "";
      elements.trackingError.classList.add("hidden");
      return;
    }

    elements.trackingError.textContent = message;
    elements.trackingError.classList.remove("hidden");
  }

  function prefillCitizenSession() {
    const session = getSession();
    if (!session || session.type !== "citizen") {
      return;
    }

    const citizen = getState().citizenUsers.find((user) => user.id === session.citizenId);
    if (!citizen) {
      return;
    }

    elements.requestForm.elements.name.value = citizen.name;
    elements.requestForm.elements.phone.value = citizen.phone;
    elements.requestForm.elements.email.value = citizen.email;
    elements.requestForm.elements.aadhaar.value = citizen.aadhaar;
  }

  function bindRequestForm() {
    elements.requestForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.requestForm).entries());
      const validationMessage = getRequestFormError(payload);

      showRequestError("");

      if (validationMessage) {
        showRequestError(validationMessage);
        return;
      }

      try {
        const requestRecord = submitCitizenRequest(payload);
        renderAcknowledgement(requestRecord);
        elements.requestForm.reset();
        renderLocalizedOptions();
        prefillCitizenSession();
        globalScope.location.hash = "submit-request";
      } catch (error) {
        showRequestError(error.message);
      }
    });
  }

  function bindTrackingForm() {
    elements.trackingForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const reference = String(new FormData(elements.trackingForm).get("reference") || "").trim();

      showTrackingError("");

      if (!reference) {
        showTrackingError(t("request.lookupEmpty"));
        elements.trackingResult.classList.add("hidden");
        return;
      }

      const requestRecord = findRequestByReference(reference);
      if (!requestRecord) {
        showTrackingError(t("request.lookupMissing"));
        elements.trackingResult.classList.add("hidden");
        return;
      }

      renderTrackingResult(requestRecord);
    });
  }

  function bindCityPrideModal() {
    const modal = document.querySelector("#city-pride-modal");
    const closeButton = document.querySelector("#city-pride-close");
    const hint = document.querySelector("#city-pride-close-hint");

    if (!modal || !closeButton) {
      return;
    }

    animateCountUp(modal);

    function closeModal() {
      modal.classList.add("is-hidden");
    }

    setTimeout(() => {
      closeButton.disabled = false;
      closeButton.classList.add("is-ready");
      if (hint) {
        hint.textContent = "You can close this update now";
      }
    }, 3000);

    closeButton.addEventListener("click", closeModal);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !closeButton.disabled) {
        closeModal();
      }
    });
  }

  function renderHeroStatusCard() {
    const liveCard = document.querySelector("#hero-live-card");
    const liveBadge = document.querySelector("#hero-live-badge");
    const liveDesc = document.querySelector("#hero-live-desc");
    const liveInfo = document.querySelector("#hero-live-info");
    const liveTitle = document.querySelector("#hero-live-title");
    const liveLocation = document.querySelector("#hero-live-location");
    const liveStages = document.querySelector("#hero-live-stages");
    const liveFooter = document.querySelector("#hero-live-footer");
    const liveRef = document.querySelector("#hero-live-ref");
    const liveDept = document.querySelector("#hero-live-dept");

    if (!liveCard || !liveStages) return;

    const urgencyScore = {
      "EMERGENCY": 4,
      "HIGH": 3,
      "MEDIUM": 2,
      "LOW": 1
    };

    // Get newest request, but prioritize by Urgency
    const request = getState().requests
      .slice()
      .sort((a, b) => {
        const scoreA = urgencyScore[a.urgency] || 0;
        const scoreB = urgencyScore[b.urgency] || 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return new Date(b.receivedAt) - new Date(a.receivedAt);
      })[0];

    // If no data, hide the dynamic parts
    if (!request) {
      liveBadge.style.display = "none";
      liveStages.style.display = "none";
      liveFooter.style.display = "none";
      if (liveInfo) liveInfo.style.display = "none";
      liveDesc.style.display = "block";
      return;
    }

    // Hide generic description, show dynamic tracking and info
    liveDesc.style.display = "none";
    liveBadge.style.display = "inline-flex";
    if (liveInfo) liveInfo.style.display = "block";

    if (liveTitle) liveTitle.textContent = request.title;
    if (liveLocation) liveLocation.textContent = "📍 " + request.locationText;

    liveFooter.style.display = "block";
    liveStages.style.display = "flex";

    liveRef.textContent = request.publicReferenceNo;
    const dept = getDepartmentById(request.departmentId);
    liveDept.textContent = (dept && localizeDepartmentPublicLabel(dept, getLanguage())) || "Routing";

    const currentStatusIndex = REQUEST_STATUS_STEPS.indexOf(request.status);

    // Use short UI aliases to prevent flex-container overflow
    const shortLabels = {
      "RECEIVED": "Received",
      "UNDER_REVIEW": "Under Review",
      "APPROVED_FOR_PLANNING": "Approved",
      "CONVERTED_TO_WORK_ORDER": "Executing",
      "CLOSED": "QC Certified"
    };

    liveStages.innerHTML = REQUEST_STATUS_STEPS.map((step, index) => {
      let cssClass = "hero-stage-pill";
      if (index < currentStatusIndex) cssClass += " done";
      if (index === currentStatusIndex) cssClass += " active";

      const shortText = shortLabels[step] || step;

      const pill = `
        <div class="${cssClass}">
          <span class="stage-dot"></span>
          <span>${escapeHtml(shortText)}</span>
        </div>
      `;

      const isLast = index === REQUEST_STATUS_STEPS.length - 1;
      const connector = isLast ? "" : `<div class="hero-stage-connector"></div>`;

      return pill + connector;
    }).join("");
  }

  function rerenderDynamicContent() {
    renderStaticText();
    renderLocalizedOptions();

    renderHeroTrustPanel();
    renderWorkflowCards();
    renderAssuranceCards();
    renderStatsGrid();
    renderImpactGrid();
    renderHeroStatusCard();
    animateCountUp(document.querySelector(".city-function-card"));

    if (currentAcknowledgement) {
      renderAcknowledgement(currentAcknowledgement);
    }

    if (currentTrackedRequest) {
      renderTrackingResult(currentTrackedRequest);
    }
  }

  function init() {
    initializeStore();
    bindLanguageSelector(elements.languageSelect);
    applyTranslations(document, getLanguage());
    renderStaticText();

    renderHeroTrustPanel();
    renderWorkflowCards();
    renderAssuranceCards();
    renderStatsGrid();
    renderImpactGrid();
    renderHeroStatusCard();
    animateCountUp(document.querySelector(".city-function-card"));
    renderLocalizedOptions();
    prefillCitizenSession();
    bindRequestForm();
    bindTrackingForm();
    bindCityPrideModal();

    document.addEventListener("crims:language-change", () => {
      rerenderDynamicContent();
    });
  }

  init();
})(window);
