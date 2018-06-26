const http = require('http')
const SDK = require('../lib/index')
const eventGatewayProcess = require('./utils/eventGatewayProcess')
const delay = require('./utils/delay')

const requests = []
const serverPort = 3336
const server = http.createServer((request, response) => {
  let body = ''
  request.on('data', chunk => {
    body += chunk.toString()
  })
  request.on('end', () => {
    requests.push(JSON.parse(body))
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ message: 'success' }))
  })
})

const eventAsyncType = {
  space: 'default',
  name: 'test.event.async'
}

const eventSyncType = {
  space: 'default',
  name: 'test.event.sync'
}

const functionAsyncConfig = {
  space: 'default',
  functionId: 'test-emit-async',
  type: 'http',
  provider: {
    url: `http://localhost:${serverPort}/test/path`
  }
}

const functionSyncConfig = {
  space: 'default',
  functionId: 'test-emit-sync',
  type: 'http',
  provider: {
    url: `http://localhost:${serverPort}/test/path`
  }
}

const subscriptionAsyncConfig = {
  type: 'async',
  functionId: 'test-emit-async',
  eventType: 'test.event.async'
}

const subscriptionSyncConfig = {
  type: 'sync',
  functionId: 'test-emit-sync',
  eventType: 'test.event.sync'
}

let eventGateway
let eventGatewayProcessId

beforeAll(() =>
eventGatewayProcess
.spawn({
  configPort: 4013,
  apiPort: 4014
})
.then(processInfo => {
  eventGatewayProcessId = processInfo.id
  eventGateway = new SDK({
    url: `http://localhost:${processInfo.apiPort}`,
    configurationUrl: `http://localhost:${processInfo.configPort}`
  })
  server.listen(serverPort)
})
.then(() => {
  return eventGateway.createEventType(eventAsyncType)
})
.then(() => {
  return eventGateway.createEventType(eventSyncType)
})
.then(() => {
  return eventGateway.createFunction(functionAsyncConfig)
})
.then(() => {
  return eventGateway.createFunction(functionSyncConfig)
})
.then(() => {
  return eventGateway.subscribe(subscriptionAsyncConfig)
})
.then(() => {
  return eventGateway.subscribe(subscriptionSyncConfig)
}))

afterAll(done => {
  eventGatewayProcess.shutDown(eventGatewayProcessId)
  server.close(() => {
    done()
  })
})

test('should asynchronously invoke the subscribed function when emitting an event', () => {
  return eventGateway
  .emit({
    cloudEventsVersion: '0.1',
    eventType: 'test.event.async',
    eventID: '1',
    source: '/services/tests',
    contentType: 'application/json',
    data: {
      foo: 'bar'
    }
  })
  .then(delay(300))
  .then(response => {
    expect(requests).toHaveLength(1)
    expect(response.status).toEqual(202)
  })
})

test('should synchronously invoke the subscribed function when emitting an event', () => {
  return eventGateway
  .emit({
    cloudEventsVersion: '0.1',
    eventType: 'test.event.sync',
    eventID: '1',
    source: '/services/tests',
    contentType: 'application/json',
    data: {
      foo: 'bar'
    }
  })
  .then(delay(300))
  .then(response => {
    console.log(response.status)
    expect(requests).toHaveLength(2)
    expect(response.status).toEqual(200)
  })
})
