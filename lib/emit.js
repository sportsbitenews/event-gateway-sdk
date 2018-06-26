'use strict'

module.exports = (config, event) => {
  return config
    .fetch(`${config.eventsUrl}`, {
      method: 'POST',
      body: JSON.stringify(event),
      headers: {
        'Content-Type': 'application/cloudevents+json'
      }
    })
    .then(response => {
      // Async subscriptions return 202, Sync subsriptions return 200
      if (response.status !== 202 || response.status !== 200) {
        response.json().then(err => {
          throw new Error(`Failed to emit the event ${event.eventType} due the error: ${err}`)
        })
      }
      return response
    })
}
