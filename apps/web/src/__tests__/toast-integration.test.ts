import { toastSuccess, toastError, toastWarning } from "@/lib/toast";
import { toast } from "sonner";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

describe("toast utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("toastSuccess calls toast.success", () => {
    toastSuccess("It worked!");
    expect(toast.success).toHaveBeenCalledWith("It worked!");
  });

  it("toastError calls toast.error", () => {
    toastError("Something broke");
    expect(toast.error).toHaveBeenCalledWith("Something broke");
  });

  it("toastWarning calls toast.warning", () => {
    toastWarning("Be careful");
    expect(toast.warning).toHaveBeenCalledWith("Be careful");
  });
});
