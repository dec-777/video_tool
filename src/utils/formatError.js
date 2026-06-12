export function formatApiError(error) {
  if (!error) {
    return "操作失败，请稍后重试";
  }

  if (error.message) {
    return error.message;
  }

  return String(error);
}
