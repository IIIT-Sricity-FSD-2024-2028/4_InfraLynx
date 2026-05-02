(function attachValidators(globalScope) {
  const crims = (globalScope.CRIMS = globalScope.CRIMS || {});
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[6-9]\d{9}$/;
  const aadhaarPattern = /^\d{12}$/;

  function isValidName(value) {
    return value.trim().length >= 3;
  }

  function isValidPhone(value) {
    return phonePattern.test(value.trim());
  }

  function isValidEmail(value) {
    return emailPattern.test(value.trim());
  }

  function isValidAadhaar(value) {
    return aadhaarPattern.test(value.trim());
  }

  function isStrongPassword(value) {
    return value.length >= 8;
  }

  function getRequestFormError(payload) {
    if (!isValidName(payload.name)) {
      return "Enter the citizen name using at least 3 characters.";
    }

    if (!isValidPhone(payload.phone)) {
      return "Enter a valid 10-digit Indian mobile number.";
    }

    if (!isValidEmail(payload.email)) {
      return "Enter a valid email address.";
    }

    if (payload.aadhaar && !isValidAadhaar(payload.aadhaar)) {
      return "Enter a valid 12-digit Aadhaar number, or leave the demo identity field blank.";
    }

    if (!payload.requestType) {
      return "Select whether this is a complaint or an improvement request.";
    }

    if (!payload.categoryId) {
      return "Select a service area for the request.";
    }

    if (payload.title.trim().length < 6) {
      return "Enter a short title with at least 6 characters.";
    }

    if (payload.description.trim().length < 20) {
      return "Describe the issue or improvement in at least 20 characters.";
    }

    if (payload.locationText.trim().length < 6) {
      return "Enter a useful location description so the field team can identify the site.";
    }

    if (!payload.urgency) {
      return "Select the urgency for this request.";
    }

    return "";
  }

  function getCitizenSignUpError(payload) {
    if (!isValidName(payload.name)) {
      return "Enter the citizen name using at least 3 characters.";
    }

    if (!isValidPhone(payload.phone)) {
      return "Enter a valid 10-digit Indian mobile number.";
    }

    if (!isValidEmail(payload.email)) {
      return "Enter a valid email address.";
    }

    if (!isValidAadhaar(payload.aadhaar)) {
      return "Enter a valid 12-digit Aadhaar number.";
    }

    if (!isStrongPassword(payload.password)) {
      return "Create a password with at least 8 characters.";
    }

    if (payload.password !== payload.confirmPassword) {
      return "Password and confirm password must match.";
    }

    return "";
  }

  function getCitizenSignInError(payload) {
    if (!payload.identifier.trim()) {
      return "Enter the email or demo ID linked to the citizen account.";
    }

    if (!payload.password.trim()) {
      return "Enter the account password.";
    }

    return "";
  }

  function getOfficialSignInError(payload) {
    if (!isValidEmail(payload.email)) {
      return "Enter your official email address.";
    }

    if (!payload.password.trim()) {
      return "Enter your account password.";
    }

    return "";
  }

  crims.validators = {
    getRequestFormError,
    getCitizenSignUpError,
    getCitizenSignInError,
    getOfficialSignInError
  };
})(window);
