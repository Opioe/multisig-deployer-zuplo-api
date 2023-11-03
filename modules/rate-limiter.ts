import { CustomRateLimitDetails, ZuploRequest } from "@zuplo/runtime";

export function rateLimitKey(
  request: ZuploRequest,
): CustomRateLimitDetails {
  if (request.user.data.custumerType == "premium") {
    return {
      key: request.user.sub,
      requestsAllowed: 5,
      timeWindowMinutes: 1,
    };
  }
  return {
    key: request.user.sub,
    requestsAllowed: 1,
    timeWindowMinutes: 1,
  };
}