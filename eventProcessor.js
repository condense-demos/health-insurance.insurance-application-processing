class ApplicationState {
  constructor(applicationId) {
    this.applicationId = applicationId;
    this.status = "CREATED";
    this.data = {};
    this.blockers = [];
    this.warnings = [];
    this.canProceedToReadiness = false;
    this.eventTimeline = []; // To track processed event types and prevent duplicates
  }

  addBlocker(message) {
    if (!this.blockers.includes(message)) {
      this.blockers.push(message);
    }
    this.updateCanProceedToReadiness();
  }

  addWarning(message) {
    if (!this.warnings.includes(message)) {
      this.warnings.push(message);
    }
    this.updateCanProceedToReadiness();
  }

  removeBlocker(message) {
    this.blockers = this.blockers.filter((b) => b !== message);
    this.updateCanProceedToReadiness();
  }

  updateCanProceedToReadiness() {
    this.canProceedToReadiness = this.blockers.length === 0;
  }

  processApplicationCreated(event) {
    if (this.eventTimeline.includes("APPLICATION_CREATED")) {
      console.warn(
        `Duplicate APPLICATION_CREATED event for ${this.applicationId}. Ignoring.`,
      );
      return;
    }
    this.data = { ...this.data, ...event.payload };
    this.eventTimeline.push("APPLICATION_CREATED");

    // Initial validation
    if (!this.data.applicantName) {
      this.addBlocker("Applicant name is missing.");
    }
    if (!this.data.age) {
      this.addBlocker("Applicant age is missing.");
    } else if (this.data.age < 18) {
      this.addBlocker("Applicant must be at least 18 years old.");
    } else if (this.data.age > 60) {
      this.addBlocker("Applicant must be less than 60 years old.");
    }

    // Specific tobacco handling
    if (this.data.tobaccoUse === "N") {
      this.data.tobaccoUse = "NON_SMOKER";
    }

    // coverageIncomeRatio calculation
    if (this.data.coverageAmount && this.data.annualIncome) {
      this.data.coverageIncomeRatio = parseFloat(
        (this.data.coverageAmount / this.data.annualIncome).toFixed(2),
      );
    }

    if (this.blockers.length > 0 || this.warnings.length > 0) {
      this.status = "FAILED_INITIAL_VALIDATION";
    } else {
      this.status = "APPLICATION_CREATED_VALIDATED";
    }

    this.updateCanProceedToReadiness();
  }

  processHealthQuestionsCompleted(event) {
    if (!this.eventTimeline.includes("APPLICATION_CREATED")) {
      console.warn(
        `HEALTH_QUESTIONS_COMPLETED event received before APPLICATION_CREATED for ${this.applicationId}. Ignoring.`,
      );
      return;
    }
    if (this.eventTimeline.includes("HEALTH_QUESTIONS_COMPLETED")) {
      console.warn(
        `Duplicate HEALTH_QUESTIONS_COMPLETED event for ${this.applicationId}. Ignoring.`,
      );
      return;
    }
    this.data = { ...this.data, healthAnswers: event.payload.answers };
    this.eventTimeline.push("HEALTH_QUESTIONS_COMPLETED");

    // Health validation
    if (this.data.healthAnswers.hasMajorIllness === "YES") {
      this.addBlocker("Applicant has major illness.");
    }
    if (this.data.healthAnswers.prescriptionMedication === "YES") {
      this.addWarning("Applicant is on prescription medication.");
      // This is explicitly not a blocking failure
    }
    if (this.data.healthAnswers.diabetes === "YES") {
      this.addWarning("Applicant has diabetes.");
    }
    if (!this.data.healthAnswers.doctorVisitedLastYear) {
      this.addBlocker("Health question: doctorVisitedLastYear is missing.");
    }

    if (this.blockers.length > 0) {
      this.status = "FAILED_HEALTH_VALIDATION";
    } else if (this.warnings.length > 0) {
      this.status = "HEALTH_VALIDATION_WITH_WARNINGS";
    } else {
      this.status = "HEALTH_QUESTIONS_VALIDATED";
    }

    this.updateCanProceedToReadiness();
  }

  processConsentReceived(event) {
    if (!this.eventTimeline.includes("APPLICATION_CREATED")) {
      console.warn(
        `CONSENT_RECEIVED event received before APPLICATION_CREATED for ${this.applicationId}. Ignoring.`,
      );
      return;
    }
    if (this.eventTimeline.includes("CONSENT_RECEIVED")) {
      console.warn(
        `Duplicate CONSENT_RECEIVED event for ${this.applicationId}. Ignoring.`,
      );
      return;
    }
    this.data = { ...this.data, consentMetadata: event.payload };
    this.eventTimeline.push("CONSENT_RECEIVED");

    // Final validation for consent
    // if (!this.data.consentMetadata.privacyPolicyAgreed) {
    //   this.addBlocker("Privacy policy not agreed.");
    // }
    // if (!this.data.consentMetadata.termsAndConditionsAgreed) {
    //   this.addBlocker("Terms and conditions not agreed.");
    // }

    // After all checks, if no blockers, update status
    if (this.blockers.length === 0 && this.warnings.length === 0) {
      this.status = "READY_FOR_UNDERWRITING";
    } else if (this.blockers.length === 0 && this.warnings.length > 0) {
      this.status = "READY_FOR_UNDERWRITING_WITH_WARNINGS";
    } else {
      this.status = "FAILED_CONSENT_VALIDATION";
    }
    this.updateCanProceedToReadiness();
  }

  getCaseProcessedEvent() {
    let caseProcessedEvent = {
      applicationId: this.applicationId,
      timestamp: new Date().toISOString(),
      status: this.status,
      currentApplicationState: { ...this.data },
      validation: {
        blockers: [...this.blockers],
        warnings: [...this.warnings],
        canProceedToReadiness: this.canProceedToReadiness,
      },
    };
    console.info("caseProcessedEvent", caseProcessedEvent);

    return caseProcessedEvent;
  }
}

class EventProcessor {
  constructor() {
    this.applicationStates = new Map(); // Stores ApplicationState instances by applicationId
  }

  processEvent(event) {
    const { eventType, applicationId, payload } = event;

    if (!applicationId) {
      console.error("Event missing applicationId:", event);
      return null; // Cannot process without an applicationId
    }

    let state = this.applicationStates.get(applicationId);

    // For APPLICATION_CREATED, create a new state if it doesn't exist
    // For other events, if state doesn't exist, ignore (as per requirement 15)
    if (!state) {
      if (eventType === "APPLICATION_CREATED") {
        state = new ApplicationState(applicationId);
        this.applicationStates.set(applicationId, state);
        console.log(`New application state created for ${applicationId}`);
      } else {
        console.warn(
          `Event ${eventType} for ${applicationId} received before APPLICATION_CREATED. Ignoring.`,
        );
        return null;
      }
    }

    // Check if event is already processed based on event type and timestamp
    // This is a simplified duplicate check. A more robust solution might involve event IDs and a timestamp in the state.
    // if (state.eventTimeline.includes(eventType)) {
    //   console.warn(
    //     `Event type ${eventType} for ${applicationId} already processed. Ignoring.`,
    //   );
    //   return state.getCaseProcessedEvent(); // Return current state as if it was processed
    // }

    switch (eventType) {
      case "APPLICATION_CREATED":
        state.processApplicationCreated(event);
        break;
      case "HEALTH_QUESTIONS_COMPLETED":
        state.processHealthQuestionsCompleted(event);
        break;
      case "CONSENT_RECEIVED":
        state.processConsentReceived(event);
        break;
      default:
        console.warn(`Unknown event type: ${eventType}`);
        return null;
    }

    return state.getCaseProcessedEvent();
  }
}

module.exports = { ApplicationState, EventProcessor };
