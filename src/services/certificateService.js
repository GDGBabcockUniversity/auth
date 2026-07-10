const EventModel = require("../models/eventModel");

const NAME_ALLOWED_REGEX = /^[a-zA-Z\s\-'.]+$/;

/**
 * Sanitizes a display name down to what the cert service's
 * `^[a-zA-Z\s\-'.]+$` regex accepts: strip diacritics, replace any other
 * disallowed character with a space, collapse whitespace, cap length.
 * Falls back to a generic name rather than failing certificate issuance.
 */
function sanitizeParticipantName(rawName) {
  if (!rawName) return "GDG Member";

  let name = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  name = name.replace(/[^a-zA-Z\s\-'.]/g, " ");
  name = name.replace(/\s+/g, " ").trim();
  if (name.length > 100) {
    name = name.slice(0, 100).trim();
  }

  if (name.length < 2 || !NAME_ALLOWED_REGEX.test(name)) {
    return "GDG Member";
  }
  return name;
}

/**
 * Certificate Service - calls the cert-generation service on check-in.
 * Never throws: failures are recorded on the certificate row as 'failed' so
 * check-in itself always succeeds. Re-checking in the same user re-invokes
 * issue() for any certificate not already 'issued' — that's the retry path.
 */
class CertificateService {
  static sanitizeParticipantName(rawName) {
    return sanitizeParticipantName(rawName);
  }

  static async issue({ certId, participantName, eventTitle, certificateType }) {
    const baseUrl = process.env.CERT_SERVICE_URL;
    const token = process.env.CERT_SERVICE_TOKEN;

    if (!baseUrl || !token) {
      console.error(
        "CertificateService: CERT_SERVICE_URL/CERT_SERVICE_TOKEN not configured"
      );
      await EventModel.markCertificateFailed(certId);
      return { status: "failed" };
    }

    const sanitizedName = sanitizeParticipantName(participantName);
    const dateIssued = new Date().toISOString().slice(0, 10);

    try {
      const response = await fetch(`${baseUrl}/certificates/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participant_name: sanitizedName,
          event_name: eventTitle,
          date_issued: dateIssued,
          certificate_type: certificateType,
          template: "gdg",
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(
          `CertificateService: cert service returned ${response.status}: ${errorText}`
        );
        await EventModel.markCertificateFailed(certId);
        return { status: "failed" };
      }

      const data = await response.json();
      const downloadUrl = `${baseUrl}${data.download_url}`;
      await EventModel.markCertificateIssued(certId, data.unique_id, downloadUrl);
      return {
        status: "issued",
        cert_service_unique_id: data.unique_id,
        download_url: downloadUrl,
      };
    } catch (error) {
      console.error("CertificateService: failed to issue certificate", error);
      await EventModel.markCertificateFailed(certId);
      return { status: "failed" };
    }
  }
}

module.exports = CertificateService;
