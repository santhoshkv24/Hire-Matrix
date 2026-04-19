const crypto = require("crypto");
const { google } = require("googleapis");
const env = require("../config/env");

const isCalendarIntegrationEnabled = () => {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_REFRESH_TOKEN &&
      env.GOOGLE_CALENDAR_ID
  );
};

const getCalendarClient = () => {
  if (!isCalendarIntegrationEnabled()) {
    throw new Error("Google Calendar integration is not configured");
  }

  const auth = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET
  );

  auth.setCredentials({
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
  });

  return google.calendar({ version: "v3", auth });
};

const buildConferenceRequest = () => {
  return {
    createRequest: {
      conferenceSolutionKey: { type: "hangoutsMeet" },
      requestId: crypto.randomUUID(),
    },
  };
};

const resolveMeetingLink = (event) => {
  if (event.hangoutLink) {
    return event.hangoutLink;
  }

  const conferenceEntry = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video"
  );

  return conferenceEntry?.uri || "";
};

const upsertGoogleMeetEvent = async ({
  eventId = null,
  summary,
  description,
  startAt,
  endAt,
  attendees = [],
}) => {
  const calendar = getCalendarClient();

  const requestBody = {
    summary,
    description,
    start: {
      dateTime: new Date(startAt).toISOString(),
    },
    end: {
      dateTime: new Date(endAt).toISOString(),
    },
    attendees: attendees
      .filter(Boolean)
      .map((email) => ({ email })),
  };

  let result;

  if (eventId) {
    result = await calendar.events.patch({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId,
      sendUpdates: "all",
      conferenceDataVersion: 1,
      requestBody: {
        ...requestBody,
      },
    });
  } else {
    result = await calendar.events.insert({
      calendarId: env.GOOGLE_CALENDAR_ID,
      sendUpdates: "all",
      conferenceDataVersion: 1,
      requestBody: {
        ...requestBody,
        conferenceData: buildConferenceRequest(),
      },
    });
  }

  const event = result.data;

  return {
    calendarEventId: event.id,
    eventLink: event.htmlLink || "",
    meetingLink: resolveMeetingLink(event),
  };
};

const cancelGoogleCalendarEvent = async (eventId) => {
  if (!eventId || !isCalendarIntegrationEnabled()) {
    return;
  }

  const calendar = getCalendarClient();
  await calendar.events.patch({
    calendarId: env.GOOGLE_CALENDAR_ID,
    eventId,
    sendUpdates: "all",
    requestBody: {
      status: "cancelled",
    },
  });
};

module.exports = {
  isCalendarIntegrationEnabled,
  upsertGoogleMeetEvent,
  cancelGoogleCalendarEvent,
};
