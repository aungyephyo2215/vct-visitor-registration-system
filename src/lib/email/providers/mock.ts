import type { EmailMessageInput, EmailProvider, EmailSendResult } from "../types";

function shouldForceFailure(): boolean {
  return process.env.EMAIL_MOCK_FAIL?.toLowerCase() === "true";
}

export const mockEmailProvider: EmailProvider = {
  name: "mock",
  async send(_message: EmailMessageInput): Promise<EmailSendResult> {
    void _message;
    if (shouldForceFailure()) {
      return {
        success: false,
        provider: "mock",
        errorCode: "MOCK_FAILURE",
        errorMessage: "Mock email provider forced failure",
      };
    }

    return {
      success: true,
      provider: "mock",
      messageId: "mock-message-id",
    };
  },
};
