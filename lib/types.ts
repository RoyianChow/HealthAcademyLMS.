export type ApiResponse<T = null> =
  | {
      status: "success";
      message: string;
      data?: T;
    }
  | {
      status: "error";
      message: string;
      data?: never;
    };