(function () {
  if (typeof window === 'undefined') {
    return;
  }

  const factory = window.trustedTypes;
  const policyName = 'app-html';

  /**
   * @param {string} value
   * @returns {TrustedHTML|string}
   */
  function passthrough(value) {
    return value;
  }

  if (!factory) {
    window.__appCreateTrustedHTML = passthrough;
    window.__appSetTrustedHTML = function (element, value) {
      element.innerHTML = value;
    };
    return;
  }

  let policy = factory.getPolicy ? factory.getPolicy(policyName) : undefined;
  if (!policy) {
    try {
      policy = factory.createPolicy(policyName, {
        createHTML: passthrough,
      });
    } catch (error) {
      console.warn('Failed to register Trusted Types policy', error);
    }
  }

  if (policy) {
    window.__appCreateTrustedHTML = (value) => policy.createHTML(value);
  } else {
    window.__appCreateTrustedHTML = passthrough;
  }

  window.__appSetTrustedHTML = function (element, value) {
    const trusted = window.__appCreateTrustedHTML(value);
    element.innerHTML = trusted;
  };
})();
