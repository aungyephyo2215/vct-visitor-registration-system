import type { EmailMessageInput, EmailProvider, EmailSendResult } from "../types";

export const noopEmailProvider: EmailProvider = {
  name: "noop",
  async send(_message: EmailMessageInput): Promise<EmailSendResult> {
    void _message;
    return {
      success: true,
      provider: "noop",
      messageId: undefined,
    };
  },
};
