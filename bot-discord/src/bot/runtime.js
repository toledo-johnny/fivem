const state = {
  client: null,
  apiServer: null,
  schedulerHeartbeatAt: null,
  lastReconciliationAt: null
};

function setBotClient(client) {
  state.client = client;
}

function getBotClient() {
  return state.client;
}

function setApiServer(apiServer) {
  state.apiServer = apiServer;
}

function getApiServer() {
  return state.apiServer;
}

function markSchedulerHeartbeat(date = new Date()) {
  state.schedulerHeartbeatAt = date;
}

function getSchedulerHeartbeat() {
  return state.schedulerHeartbeatAt;
}

function markReconciliation(date = new Date()) {
  state.lastReconciliationAt = date;
}

function getLastReconciliation() {
  return state.lastReconciliationAt;
}

module.exports = {
  getApiServer,
  getBotClient,
  getLastReconciliation,
  getSchedulerHeartbeat,
  markReconciliation,
  markSchedulerHeartbeat,
  setApiServer,
  setBotClient
};
