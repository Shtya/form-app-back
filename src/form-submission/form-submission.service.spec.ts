import { BadGatewayException } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { FormSubmissionService } from "./form-submission.service";

describe("FormSubmissionService.create", () => {
  const form = {
    id: 12,
    type: "candidate",
    fields: [
      {
        key: "البريد-الإلكتروني---email",
        label: "البريد الإلكتروني - Email",
        type: "email",
      },
    ],
  };
  const user = {
    id: 8,
    email: "2432807556",
    project: { id: 31, name: "Logitech" },
  };

  function createService(httpResult: any) {
    const submission = { id: 91 };
    const submissionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn().mockResolvedValue(submission),
    };

    const service = new FormSubmissionService(
      submissionRepo as any,
      { findOne: jest.fn().mockResolvedValue(user) } as any,
      { findOne: jest.fn().mockResolvedValue(form) } as any,
      { post: jest.fn().mockReturnValue(httpResult) } as any,
    );

    return {
      service,
      submissionRepo,
      httpService: (service as any).httpService,
    };
  }

  it("sends the applicant email only inside personalInformation", async () => {
    const { service, httpService } = createService(
      of({ data: { success: true, data: { employee: { id: "employee-1" } } } }),
    );

    await service.create(8, {
      form_id: "12",
      answers: { "البريد-الإلكتروني---email": "applicant@example.com" },
    });

    const payload = httpService.post.mock.calls[0][1];
    expect(payload.Email).toBeUndefined();
    expect(payload.personalInformation).toEqual([
      expect.objectContaining({ value: "applicant@example.com" }),
    ]);
  });

  it("rejects the submission when the CRM import fails", async () => {
    const { service, submissionRepo } = createService(
      throwError(() => new Error("CRM unavailable")) as any,
    );

    await expect(
      service.create(8, {
        form_id: "12",
        answers: { "البريد-الإلكتروني---email": "applicant@example.com" },
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(submissionRepo.save).not.toHaveBeenCalled();
  });

  it("rejects the submission when CRM returns an unsuccessful response", async () => {
    const { service, submissionRepo } = createService(
      of({ data: { success: false } }),
    );

    await expect(
      service.create(8, {
        form_id: "12",
        answers: { "البريد-الإلكتروني---email": "applicant@example.com" },
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(submissionRepo.save).not.toHaveBeenCalled();
  });
});

describe("FormSubmissionService.resendToCrm", () => {
  it("updates the linked CRM employee instead of creating a duplicate", async () => {
    const submission = {
      id: 91,
      employeeId: "employee-1",
      form_id: "12",
      answers: { "البريد-الإلكتروني---email": "applicant@example.com" },
      user: { project: { id: 31, name: "Logitech" } },
    };
    const submissionRepo = {
      findOne: jest.fn().mockResolvedValue(submission),
      save: jest.fn().mockResolvedValue(submission),
    };
    const formRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 12,
        type: "candidate",
        fields: [
          {
            key: "البريد-الإلكتروني---email",
            label: "البريد الإلكتروني - Email",
            type: "email",
          },
        ],
      }),
    };
    const httpService = {
      post: jest.fn(),
      put: jest.fn().mockReturnValue(of({ data: { id: "employee-1" } })),
    };
    const service = new FormSubmissionService(
      submissionRepo as any,
      {} as any,
      formRepo as any,
      httpService as any,
    );

    await service.resendToCrm(91);

    expect(httpService.put).toHaveBeenCalledWith(
      expect.stringContaining("/employees/employee-1"),
      expect.objectContaining({ personalInformation: expect.any(Array) }),
      expect.any(Object),
    );
    expect(httpService.post).not.toHaveBeenCalled();
    expect(submissionRepo.save).toHaveBeenCalledWith(submission);
  });
});
