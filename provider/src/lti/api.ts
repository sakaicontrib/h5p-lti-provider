import { CustomRequest } from '../CustomTypes';
const lti = require("ims-lti");

// Send outcomes function
// Takes a score from the query params (e.g. "?score=0.5")
// Sends it back to the LTI Consumer
// Returns json {"success": boolean, "error": string, "result": boolean, "score": float}
// The LTI Consumer is probably expecting a floating point number between 0 and 1.
export const sendOutcome = async (req: CustomRequest, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: "Invalid session" });
  }
	const score = parseFloat(req.query.score as string) || 0;
	req.session.provider.signer = lti.HMAC_SHA1;
	const outcome_service = lti.Extensions.Outcomes.init(req.session.provider);
  if (outcome_service) {
    outcome_service.send_replace_result(score, (err, result) => {
      if (err) {
        return res.json({ success: false, error: err });
      } else {
        return res.json({ success: true, result, score });
      }
    });
  } else {
    return res.json({
      success: false,
      error: "No outcome service available for this provider"
    });
  }
};
