import { Event } from '../generated/schema.js'

export type MilkyEventTypes = {
  [K in Event['event_type']]: Extract<Event, { event_type: K }>['data']
}
