'use strict';

const { buildHttpClient } = require('./medicalApi/shared');
const capability = require('./medicalApi/capability');
const catalogService = require('./medicalApi/catalogService');
const operationsService = require('./medicalApi/operationsService');

class MedicalApiService {
  constructor() {
    this.mode = String(process.env.MEDICAL_API_MODE || 'auto').toLowerCase();
    this.baseURL = process.env.MEDICAL_API_BASE_URL || '';
    this.apiKey = process.env.MEDICAL_API_KEY || '';
    this.allowStubFallback =
      String(process.env.MEDICAL_API_ALLOW_STUB_FALLBACK || 'false').toLowerCase() === 'true';
    this.client = buildHttpClient(this.baseURL, this.apiKey);
    this.failureCount = 0;
    this.circuitOpenedAt = 0;
  }

  hasLiveConfig() {
    return capability.hasLiveConfig(this);
  }

  getModeStrategy() {
    return capability.getModeStrategy(this);
  }

  isLiveMode() {
    return capability.isLiveMode(this);
  }

  getSourceTag() {
    return capability.getSourceTag(this);
  }

  getModeTag() {
    return capability.getModeTag(this);
  }

  getCapabilityReport() {
    return capability.getCapabilityReport(this);
  }

  isCircuitOpen() {
    return capability.isCircuitOpen(this);
  }

  requestWithRetry(operation, requestFactory) {
    return capability.requestWithRetry(this, operation, requestFactory);
  }

  execute(operation, stubFactory, liveFactory) {
    return capability.execute(this, operation, stubFactory, liveFactory);
  }

  fetchHospitals() {
    return catalogService.fetchHospitals(this);
  }

  fetchDepartments(hospitalId) {
    return catalogService.fetchDepartments(this, hospitalId);
  }

  fetchDoctors(departmentId) {
    return catalogService.fetchDoctors(this, departmentId);
  }

  fetchDoctorDetail(doctorId) {
    return catalogService.fetchDoctorDetail(this, doctorId);
  }

  createConsultSession(payload) {
    return operationsService.createConsultSession(this, payload);
  }

  createAppointment(payload) {
    return operationsService.createAppointment(this, payload);
  }

  cancelAppointment(payload = {}) {
    return operationsService.cancelAppointment(this, payload);
  }

  fetchMedicalReports(userId, filters = {}) {
    return operationsService.fetchMedicalReports(this, userId, filters);
  }
}

module.exports = new MedicalApiService();
