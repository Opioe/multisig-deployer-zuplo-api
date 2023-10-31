import { CustomRateLimitDetails, ZuploRequest } from "@zuplo/runtime";

export function rateLimitKey(
  request: ZuploRequest,
  context: ZuploContext,
  policyName: string
): CustomRateLimitDetails {
  context.log.info(
    `processing customerId '${request.params.customerId}' for rate-limit policy '${policyName}'`
  );
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