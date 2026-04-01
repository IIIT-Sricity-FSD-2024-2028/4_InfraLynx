(function attachI18n(globalScope) {
  const crims = (globalScope.CRIMS = globalScope.CRIMS || {});
  const { getLanguage, setLanguage } = crims.store;

  const LANGUAGE_OPTIONS = [
    { code: "en", label: "English" },
    { code: "te", label: "తెలుగు" },
    { code: "hi", label: "हिंदी" }
  ];

  const translations = {
    en: {
      "nav.features": "Services",
      "nav.workflow": "Workflow",
      "nav.roles": "Official Roles",
      "nav.track": "Track Request",
      "nav.citizenAccess": "Citizen Access",
      "nav.officialAccess": "Official Sign In",
      "landing.eyebrow": "Citizen-first infrastructure service portal",
      "landing.titleLineOne": "CRIMS keeps public infrastructure",
      "landing.titleLineTwo": "transparent, responsive, and human.",
      "landing.lead":
        "Citizens can raise civic complaints or improvement requests, receive a reference number immediately, and track progress.",
      "landing.primaryCta": "Submit a request",
      "landing.secondaryCta": "Go to secure access",
      "landing.heroBadge": "Light theme default",
      "landing.heroPanelTitle": "Public trust panel",
      "landing.heroPanelCopy":
        "Built for civic pride, development visibility, service responsiveness, and accountable delivery.",
      "landing.publicPromiseLabel": "What citizens can expect",
      "landing.publicPromiseOne": "Instant acknowledgement with a public reference number",
      "landing.publicPromiseTwo": "Only concise public-safe service information on the landing page",
      "landing.publicPromiseThree": "Clear separation between citizen access and official government access",
      "landing.statsHeading": "Visible progress citizens can feel proud of",
      "landing.statsCopy":
        "CRIMS presents public-facing development outcomes in a concise way while keeping deeper operational workflows inside secure role-based spaces.",
      "landing.workflowKicker": "Workflow",
      "landing.workflowHeading": "From citizen request to accountable infrastructure action",
      "landing.workflowIntro":
        "The public journey mirrors the schema: request intake, administrative review, planning, work-order conversion, execution, and closure.",
      "landing.requestKicker": "Raise a request",
      "landing.requestHeading": "Submit a complaint or infrastructure improvement request",
      "landing.requestIntro":
        "This form is citizen-facing and creates an immediate acknowledgement.",
      "landing.trackKicker": "Track by reference number",
      "landing.trackHeading": "Check the current status of your submitted request",
      "landing.trackIntro":
        "Tracking is reference-based, keeping the public flow simple.",
      "landing.rolesKicker": "Official roles",
      "landing.rolesHeading": "Secure government workflows begin after sign-in",
      "landing.rolesIntro":
        "Internal actors are invite-only in this prototype, which is the more professional and real-world approach for government systems.",
      "landing.prideKicker": "Why this matters",
      "landing.prideHeading": "A public portal that signals development, trust, and city pride",
      "landing.authCtaTitle": "Need secure access?",
      "landing.authCtaCopy":
        "Citizens can create an access profile, while officials use role-based government sign-in.",
      "landing.authCtaButton": "Open auth portal",
      "request.typeLabel": "Request type",
      "request.typeComplaint": "Complaint",
      "request.typeImprovement": "Improvement",
      "request.categoryLabel": "Service area",
      "request.titleLabel": "Request title",
      "request.descriptionLabel": "Describe the issue or improvement",
      "request.locationLabel": "Location text",
      "request.urgencyLabel": "Urgency",
      "request.urgencyLow": "Low",
      "request.urgencyMedium": "Medium",
      "request.urgencyHigh": "High",
      "request.urgencyEmergency": "Emergency",
      "request.nameLabel": "Citizen name",
      "request.phoneLabel": "Phone number",
      "request.emailLabel": "Email address",
      "request.aadhaarLabel": "Aadhaar number",
      "request.submit": "Submit request",
      "request.ackLabel": "Acknowledgement generated",
      "request.ackCopy": "Your request has been received and logged for review.",
      "request.nextStep": "Next public step",
      "request.nextStepValue": "Administrative review and departmental routing",
      "request.lookupLabel": "Reference number",
      "request.lookupButton": "Track request",
      "request.lookupHint": "Example: CRIMS-2026-0042",
      "request.lookupEmpty": "Enter a reference number to track your request.",
      "request.lookupMissing": "No request was found for that reference number.",
      "request.lookupStatus": "Current status",
      "request.lookupDepartment": "Responsible department",
      "request.lookupReceived": "Submitted on",
      "request.lookupTitle": "Request title",
      "request.lookupLocation": "Location",
      "auth.backHome": "Back to home",
      "auth.title": "Secure access for citizens and officials",
      "auth.copy":
        "Citizens can create or use an access profile. Officials sign in through role-based government access only.",
      "auth.citizenTab": "Citizen Access",
      "auth.officialTab": "Official Access",
      "auth.citizenSignIn": "Citizen sign in",
      "auth.citizenSignUp": "Create citizen account",
      "auth.officialHeading": "Official government sign in",
      "auth.officialCopy":
        "Official accounts are invite-only for this prototype. Select your role before using mock credentials.",
      "auth.demoButton": "Use mock credentials",
      "auth.signInButton": "Sign in",
      "auth.signUpButton": "Create account",
      "auth.roleLabel": "Select role",
      "auth.emailLabel": "Official email address",
      "auth.passwordLabel": "Password",
      "auth.confirmPasswordLabel": "Confirm password",
      "auth.identifierLabel": "Aadhaar number or email",
      "auth.profileCardTitle": "Citizen account policy",
      "auth.profileCardCopy":
        "One citizen identity is allowed per Aadhaar number in this prototype. Officials are sign-in only.",
      "auth.successCitizen": "Citizen access ready. You can now track your requests more easily.",
      "auth.successOfficial": "Official access verified. Your role-based workspace is ready in this prototype.",
      "auth.noteOfficial": "For account creation, contact the CRIMS system administrator.",
      "auth.sampleCitizens": "Citizen profile summary",
      "auth.sampleOfficials": "Official access summary",
      "auth.roleGuideTitle": "Official access guidance",
      "auth.roleGuideEmpty": "Select a role to see its purpose and workspace handoff.",
      "auth.roleGuideWorkspace": "Workspace",
      "auth.roleGuideTip": "Use the demo button to load the mock credentials for the selected role."
    },
    te: {
      "nav.features": "సేవలు",
      "nav.workflow": "వర్క్‌ఫ్లో",
      "nav.roles": "అధికారిక పాత్రలు",
      "nav.track": "అభ్యర్థన ట్రాక్ చేయండి",
      "nav.citizenAccess": "పౌర ప్రవేశం",
      "nav.officialAccess": "అధికారిక సైన్ ఇన్",
      "landing.eyebrow": "పౌరుల కోసం రూపొందించిన మౌలిక వసతుల సేవా పోర్టల్",
      "landing.titleLineOne": "CRIMS ప్రజా మౌలిక వసతులను",
      "landing.titleLineTwo": "స్పష్టంగా, వేగంగా, మానవీయంగా ఉంచుతుంది.",
      "landing.lead":
        "పౌరులు ఫిర్యాదు లేదా అభివృద్ధి అభ్యర్థన ఇవ్వవచ్చు, వెంటనే రిఫరెన్స్ నంబర్ పొందవచ్చు, మరియు CRIMS స్కీమా ప్రకారం పురోగతిని ట్రాక్ చేయవచ్చు.",
      "landing.primaryCta": "అభ్యర్థన పంపండి",
      "landing.secondaryCta": "సురక్షిత ప్రవేశానికి వెళ్ళండి",
      "landing.heroBadge": "లైట్ థీమ్ డిఫాల్ట్",
      "landing.heroPanelTitle": "ప్రజా నమ్మకం ప్యానెల్",
      "landing.heroPanelCopy":
        "పౌర గర్వం, అభివృద్ధి దృశ్యమానం, సేవల వేగం, మరియు బాధ్యతాయుత అమలు కోసం రూపొందించబడింది.",
      "landing.publicPromiseLabel": "పౌరులు ఏమి ఆశించవచ్చు",
      "landing.publicPromiseOne": "తక్షణ అంగీకారం మరియు పబ్లిక్ రిఫరెన్స్ నంబర్",
      "landing.publicPromiseTwo": "ల్యాండింగ్ పేజీలో సంక్షిప్త ప్రజా సమాచారం మాత్రమే",
      "landing.publicPromiseThree": "పౌర మరియు అధికారిక ప్రవేశాల మధ్య స్పష్టమైన విభజన",
      "landing.statsHeading": "పౌరులు గర్వపడేలా కనిపించే పురోగతి",
      "landing.statsCopy":
        "CRIMS ప్రజా అభివృద్ధి ఫలితాలను సంక్షిప్తంగా చూపిస్తుంది, లోతైన ఆపరేషన్లు మాత్రం సురక్షిత పాత్రాధారిత స్థలాల్లో ఉంటాయి.",
      "landing.workflowKicker": "స్కీమా కు అనుసరించిన వర్క్‌ఫ్లో",
      "landing.workflowHeading": "పౌర అభ్యర్థన నుండి బాధ్యతాయుత మౌలిక వసతుల చర్య వరకు",
      "landing.workflowIntro":
        "ఈ పౌర ప్రయాణం స్కీమా ప్రకారం ఉంటుంది: అభ్యర్థన స్వీకరణ, పరిపాలనా సమీక్ష, ప్రణాళిక, వర్క్ ఆర్డర్, అమలు, ముగింపు.",
      "landing.requestKicker": "అభ్యర్థన ఇవ్వండి",
      "landing.requestHeading": "ఫిర్యాదు లేదా మౌలిక వసతుల అభివృద్ధి అభ్యర్థన పంపండి",
      "landing.requestIntro":
        "ఈ ఫారం పౌరుల కోసం. ఇది స్కీమాలోని `RECEIVED` స్థితితో వెంటనే అంగీకారాన్ని సృష్టిస్తుంది.",
      "landing.trackKicker": "రిఫరెన్స్ నంబర్ ద్వారా ట్రాక్ చేయండి",
      "landing.trackHeading": "మీ అభ్యర్థన ప్రస్తుత స్థితిని తెలుసుకోండి",
      "landing.trackIntro":
        "ట్రాకింగ్ రిఫరెన్స్ నంబర్ ఆధారంగా సులభంగా ఉంటుంది, ఇది స్కీమాలోని `public_reference_no` కి అనుసంధానమై ఉంటుంది.",
      "landing.rolesKicker": "అధికారిక పాత్రలు",
      "landing.rolesHeading": "సురక్షిత ప్రభుత్వ వర్క్‌ఫ్లోలు సైన్ ఇన్ తర్వాత ప్రారంభమవుతాయి",
      "landing.rolesIntro":
        "ఈ ప్రోటోటైప్‌లో అంతర్గత ఖాతాలు ఆహ్వానం ద్వారా మాత్రమే ఉంటాయి. ఇది ప్రభుత్వ వ్యవస్థకు మరింత వాస్తవికమైన మరియు ప్రొఫెషనల్ విధానం.",
      "landing.prideKicker": "ఇది ఎందుకు ముఖ్యము",
      "landing.prideHeading": "అభివృద్ధి, నమ్మకం, నగర గర్వాన్ని చూపే ప్రజా పోర్టల్",
      "landing.authCtaTitle": "సురక్షిత ప్రవేశం కావాలా?",
      "landing.authCtaCopy":
        "పౌరులు ప్రొఫైల్ సృష్టించుకోవచ్చు. అధికారులు పాత్ర ఆధారిత ప్రభుత్వ సైన్ ఇన్ ఉపయోగిస్తారు.",
      "landing.authCtaButton": "ఆథ్ పోర్టల్ తెరవండి",
      "request.typeLabel": "అభ్యర్థన రకం",
      "request.typeComplaint": "ఫిర్యాదు",
      "request.typeImprovement": "అభివృద్ధి",
      "request.categoryLabel": "సేవా విభాగం",
      "request.titleLabel": "అభ్యర్థన శీర్షిక",
      "request.descriptionLabel": "సమస్య లేదా అభివృద్ధిని వివరించండి",
      "request.locationLabel": "ప్రదేశం వివరాలు",
      "request.urgencyLabel": "తక్షణత",
      "request.urgencyLow": "తక్కువ",
      "request.urgencyMedium": "మధ్యస్థ",
      "request.urgencyHigh": "అధిక",
      "request.urgencyEmergency": "అత్యవసరం",
      "request.nameLabel": "పౌరుని పేరు",
      "request.phoneLabel": "ఫోన్ నంబర్",
      "request.emailLabel": "ఈమెయిల్ చిరునామా",
      "request.aadhaarLabel": "ఆధార్ నంబర్",
      "request.submit": "అభ్యర్థన పంపండి",
      "request.ackLabel": "అంగీకారం రూపొందించబడింది",
      "request.ackCopy": "మీ అభ్యర్థన స్వీకరించబడింది మరియు సమీక్ష కోసం నమోదు చేయబడింది.",
      "request.nextStep": "తదుపరి ప్రజా దశ",
      "request.lookupLabel": "రిఫరెన్స్ నంబర్",
      "request.lookupButton": "అభ్యర్థన ట్రాక్ చేయండి",
      "request.lookupHint": "ఉదాహరణ: CRIMS-2026-0042",
      "request.lookupEmpty": "మీ అభ్యర్థనను ట్రాక్ చేయడానికి రిఫరెన్స్ నంబర్ ఇవ్వండి.",
      "request.lookupMissing": "ఆ రిఫరెన్స్ నంబర్‌కు సంబంధించిన అభ్యర్థన కనబడలేదు.",
      "request.lookupStatus": "ప్రస్తుత స్థితి",
      "request.lookupDepartment": "బాధ్యత వహించే విభాగం",
      "request.lookupReceived": "సమర్పించిన తేదీ",
      "request.lookupTitle": "అభ్యర్థన శీర్షిక",
      "request.lookupLocation": "ప్రదేశం",
      "auth.backHome": "హోమ్ కు తిరిగి వెళ్ళండి",
      "auth.title": "పౌరులు మరియు అధికారుల కోసం సురక్షిత ప్రవేశం",
      "auth.copy":
        "పౌరులు ప్రొఫైల్ సృష్టించవచ్చు లేదా ఉపయోగించవచ్చు. అధికారులు ప్రభుత్వ పాత్ర ఆధారిత సైన్ ఇన్ మాత్రమే ఉపయోగిస్తారు.",
      "auth.citizenTab": "పౌర ప్రవేశం",
      "auth.officialTab": "అధికారిక ప్రవేశం",
      "auth.citizenSignIn": "పౌర సైన్ ఇన్",
      "auth.citizenSignUp": "పౌర ఖాతా సృష్టించండి",
      "auth.officialHeading": "అధికారిక ప్రభుత్వ సైన్ ఇన్",
      "auth.officialCopy":
        "ఈ ప్రోటోటైప్‌లో అధికారిక ఖాతాలు ఆహ్వానం ద్వారా మాత్రమే ఉంటాయి. మాక్ క్రెడెన్షియల్స్ ఉపయోగించే ముందు పాత్ర ఎంచుకోండి.",
      "auth.demoButton": "మాక్ క్రెడెన్షియల్స్ ఉపయోగించండి",
      "auth.signInButton": "సైన్ ఇన్",
      "auth.signUpButton": "ఖాతా సృష్టించండి",
      "auth.roleLabel": "పాత్ర ఎంచుకోండి",
      "auth.emailLabel": "అధికారిక ఈమెయిల్ చిరునామా",
      "auth.passwordLabel": "పాస్‌వర్డ్",
      "auth.confirmPasswordLabel": "పాస్‌వర్డ్ నిర్ధారించండి",
      "auth.identifierLabel": "ఆధార్ నంబర్ లేదా ఈమెయిల్",
      "auth.profileCardTitle": "పౌర ఖాతా విధానం",
      "auth.profileCardCopy":
        "ఈ ప్రోటోటైప్‌లో ప్రతి ఆధార్ నంబర్‌కు ఒక పౌర ఐడెంటిటీ మాత్రమే అనుమతించబడుతుంది. అధికారులు సైన్ ఇన్ మాత్రమే.",
      "auth.successCitizen": "పౌర ప్రవేశం సిద్ధంగా ఉంది. ఇప్పుడు మీ అభ్యర్థనలను మరింత సులభంగా ట్రాక్ చేయవచ్చు.",
      "auth.successOfficial": "అధికారిక ప్రవేశం ధృవీకరించబడింది. తదుపరి దశలో మీ పాత్ర వర్క్‌స్పేస్‌ను అనుసంధానించవచ్చు.",
      "auth.noteOfficial": "ఖాతా సృష్టి కోసం CRIMS సిస్టమ్ అడ్మినిస్ట్రేటర్‌ను సంప్రదించండి.",
      "auth.sampleCitizens": "పౌర ప్రొఫైల్ సారాంశం",
      "auth.sampleOfficials": "అధికారిక ప్రవేశ సారాంశం"
    },
    hi: {
      "nav.features": "सेवाएं",
      "nav.workflow": "वर्कफ्लो",
      "nav.roles": "आधिकारिक भूमिकाएं",
      "nav.track": "अनुरोध ट्रैक करें",
      "nav.citizenAccess": "नागरिक प्रवेश",
      "nav.officialAccess": "आधिकारिक साइन इन",
      "landing.eyebrow": "नागरिक-केंद्रित अवसंरचना सेवा पोर्टल",
      "landing.titleLineOne": "CRIMS सार्वजनिक अवसंरचना को",
      "landing.titleLineTwo": "पारदर्शी, उत्तरदायी और मानवीय बनाता है।",
      "landing.lead":
        "नागरिक शिकायत या सुधार अनुरोध दर्ज कर सकते हैं, तुरंत संदर्भ संख्या पा सकते हैं, और CRIMS स्कीमा के अनुसार प्रगति ट्रैक कर सकते हैं।",
      "landing.primaryCta": "अनुरोध जमा करें",
      "landing.secondaryCta": "सुरक्षित प्रवेश पर जाएं",
      "landing.heroBadge": "लाइट थीम डिफॉल्ट",
      "landing.heroPanelTitle": "जन विश्वास पैनल",
      "landing.heroPanelCopy":
        "नागरिक गर्व, विकास की दृश्यता, सेवा की गति और जवाबदेह कार्यान्वयन के लिए बनाया गया है।",
      "landing.publicPromiseLabel": "नागरिक क्या उम्मीद कर सकते हैं",
      "landing.publicPromiseOne": "तुरंत स्वीकृति और सार्वजनिक संदर्भ संख्या",
      "landing.publicPromiseTwo": "लैंडिंग पेज पर केवल संक्षिप्त सार्वजनिक जानकारी",
      "landing.publicPromiseThree": "नागरिक और आधिकारिक प्रवेश के बीच स्पष्ट विभाजन",
      "landing.statsHeading": "ऐसी प्रगति जिस पर नागरिक गर्व कर सकें",
      "landing.statsCopy":
        "CRIMS सार्वजनिक विकास परिणामों को संक्षेप में दिखाता है, जबकि गहरे संचालन सुरक्षित भूमिका-आधारित क्षेत्रों में रहते हैं।",
      "landing.workflowKicker": "स्कीमा के अनुरूप वर्कफ्लो",
      "landing.workflowHeading": "नागरिक अनुरोध से जवाबदेह अवसंरचना कार्रवाई तक",
      "landing.workflowIntro":
        "यह सार्वजनिक यात्रा स्कीमा को दर्शाती है: अनुरोध प्राप्ति, प्रशासनिक समीक्षा, योजना, वर्क ऑर्डर, कार्यान्वयन और समापन।",
      "landing.requestKicker": "अनुरोध दर्ज करें",
      "landing.requestHeading": "शिकायत या अवसंरचना सुधार अनुरोध जमा करें",
      "landing.requestIntro":
        "यह फॉर्म नागरिकों के लिए है और स्कीमा की `RECEIVED` स्थिति के साथ तुरंत स्वीकृति बनाता है।",
      "landing.trackKicker": "संदर्भ संख्या से ट्रैक करें",
      "landing.trackHeading": "अपने अनुरोध की वर्तमान स्थिति देखें",
      "landing.trackIntro":
        "ट्रैकिंग केवल संदर्भ संख्या से सरल रखी गई है, जो स्कीमा के `public_reference_no` से मेल खाती है।",
      "landing.rolesKicker": "आधिकारिक भूमिकाएं",
      "landing.rolesHeading": "सुरक्षित सरकारी वर्कफ्लो साइन इन के बाद शुरू होते हैं",
      "landing.rolesIntro":
        "इस प्रोटोटाइप में आंतरिक खाते केवल आमंत्रण-आधारित हैं। सरकारी सिस्टम के लिए यही अधिक पेशेवर और वास्तविक तरीका है।",
      "landing.prideKicker": "यह क्यों महत्वपूर्ण है",
      "landing.prideHeading": "ऐसा सार्वजनिक पोर्टल जो विकास, विश्वास और शहर का गर्व दिखाए",
      "landing.authCtaTitle": "क्या आपको सुरक्षित प्रवेश चाहिए?",
      "landing.authCtaCopy":
        "नागरिक एक्सेस प्रोफाइल बना सकते हैं, जबकि अधिकारी भूमिका-आधारित सरकारी साइन इन का उपयोग करते हैं।",
      "landing.authCtaButton": "ऑथ पोर्टल खोलें",
      "request.typeLabel": "अनुरोध प्रकार",
      "request.typeComplaint": "शिकायत",
      "request.typeImprovement": "सुधार",
      "request.categoryLabel": "सेवा क्षेत्र",
      "request.titleLabel": "अनुरोध शीर्षक",
      "request.descriptionLabel": "समस्या या सुधार का विवरण दें",
      "request.locationLabel": "स्थान विवरण",
      "request.urgencyLabel": "तत्कालता",
      "request.urgencyLow": "कम",
      "request.urgencyMedium": "मध्यम",
      "request.urgencyHigh": "उच्च",
      "request.urgencyEmergency": "आपातकाल",
      "request.nameLabel": "नागरिक का नाम",
      "request.phoneLabel": "फोन नंबर",
      "request.emailLabel": "ईमेल पता",
      "request.aadhaarLabel": "आधार संख्या",
      "request.submit": "अनुरोध जमा करें",
      "request.ackLabel": "स्वीकृति तैयार हो गई",
      "request.ackCopy": "आपका अनुरोध प्राप्त हुआ है और समीक्षा के लिए दर्ज कर लिया गया है।",
      "request.nextStep": "अगला सार्वजनिक चरण",
      "request.lookupLabel": "संदर्भ संख्या",
      "request.lookupButton": "अनुरोध ट्रैक करें",
      "request.lookupHint": "उदाहरण: CRIMS-2026-0042",
      "request.lookupEmpty": "अपने अनुरोध को ट्रैक करने के लिए संदर्भ संख्या दर्ज करें।",
      "request.lookupMissing": "उस संदर्भ संख्या के लिए कोई अनुरोध नहीं मिला।",
      "request.lookupStatus": "वर्तमान स्थिति",
      "request.lookupDepartment": "जिम्मेदार विभाग",
      "request.lookupReceived": "जमा करने की तिथि",
      "request.lookupTitle": "अनुरोध शीर्षक",
      "request.lookupLocation": "स्थान",
      "auth.backHome": "होम पर वापस जाएं",
      "auth.title": "नागरिकों और अधिकारियों के लिए सुरक्षित प्रवेश",
      "auth.copy":
        "नागरिक प्रोफाइल बना सकते हैं या उसका उपयोग कर सकते हैं। अधिकारी केवल भूमिका-आधारित सरकारी साइन इन का उपयोग करते हैं।",
      "auth.citizenTab": "नागरिक प्रवेश",
      "auth.officialTab": "आधिकारिक प्रवेश",
      "auth.citizenSignIn": "नागरिक साइन इन",
      "auth.citizenSignUp": "नागरिक खाता बनाएं",
      "auth.officialHeading": "आधिकारिक सरकारी साइन इन",
      "auth.officialCopy":
        "इस प्रोटोटाइप में आधिकारिक खाते केवल आमंत्रण द्वारा उपलब्ध हैं। मॉक क्रेडेंशियल्स उपयोग करने से पहले भूमिका चुनें।",
      "auth.demoButton": "मॉक क्रेडेंशियल्स उपयोग करें",
      "auth.signInButton": "साइन इन",
      "auth.signUpButton": "खाता बनाएं",
      "auth.roleLabel": "भूमिका चुनें",
      "auth.emailLabel": "आधिकारिक ईमेल पता",
      "auth.passwordLabel": "पासवर्ड",
      "auth.confirmPasswordLabel": "पासवर्ड की पुष्टि करें",
      "auth.identifierLabel": "आधार संख्या या ईमेल",
      "auth.profileCardTitle": "नागरिक खाता नीति",
      "auth.profileCardCopy":
        "इस प्रोटोटाइप में प्रत्येक आधार संख्या के लिए केवल एक नागरिक पहचान की अनुमति है। अधिकारियों के लिए केवल साइन इन उपलब्ध है।",
      "auth.successCitizen": "नागरिक प्रवेश तैयार है। अब आप अपने अनुरोध अधिक आसानी से ट्रैक कर सकते हैं।",
      "auth.successOfficial": "आधिकारिक प्रवेश सत्यापित हो गया। आपको आपके workspace पर भेजा जा रहा है।",
      "auth.noteOfficial": "खाता बनाने के लिए CRIMS सिस्टम एडमिनिस्ट्रेटर से संपर्क करें।",
      "auth.sampleCitizens": "नागरिक प्रोफाइल सारांश",
      "auth.sampleOfficials": "आधिकारिक प्रवेश सारांश"
    }
  };

  function t(key, languageCode) {
    const resolvedLanguage = languageCode || getLanguage();
    return (translations[resolvedLanguage] && translations[resolvedLanguage][key]) || translations.en[key] || key;
  }

  function applyTranslations(root, languageCode) {
    const resolvedRoot = root || document;
    const resolvedLanguage = languageCode || getLanguage();
    document.documentElement.lang = resolvedLanguage;

    resolvedRoot.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n, resolvedLanguage);
    });

    resolvedRoot.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder, resolvedLanguage));
    });
  }

  function bindLanguageSelector(selectElement) {
    selectElement.innerHTML = LANGUAGE_OPTIONS.map((option) => {
      return `<option value="${option.code}">${option.label}</option>`;
    }).join("");

    selectElement.value = getLanguage();

    selectElement.addEventListener("change", (event) => {
      setLanguage(event.target.value);
      applyTranslations(document, event.target.value);
      document.dispatchEvent(
        new CustomEvent("crims:language-change", {
          detail: { language: event.target.value }
        })
      );
    });
  }

  crims.i18n = {
    LANGUAGE_OPTIONS,
    t,
    applyTranslations,
    bindLanguageSelector
  };
})(window);
