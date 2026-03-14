import axios from 'axios';
import createAxiosInstance from './axios';
import { API_BASE_URLS, PROCTOR_AGENT, STORAGE_KEYS } from '../utils/constants';

const proctoringApi = createAxiosInstance(API_BASE_URLS.PROCTORING);

const ACTIVE_SESSION_KEY = 'neuroiq_active_proctor_session';

const readStoredSession = () => {
	try {
		const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
};

export const persistActiveSession = (session) => {
	if (!session?.session_id) return;
	localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
};

export const getPersistedActiveSession = () => readStoredSession();

export const clearPersistedActiveSession = () => {
	localStorage.removeItem(ACTIVE_SESSION_KEY);
};

export const startExam = async ({ exam_id }) => {
	const response = await proctoringApi.post('/api/proctoring/exam/start', { exam_id });
	persistActiveSession({
		session_id: response.data?.session_id,
		exam_id: response.data?.exam_id,
		start_time: response.data?.start_time,
		status: response.data?.status,
	});
	return response.data;
};

export const getMyExamStatus = async (examId) => {
	const response = await proctoringApi.get(`/api/proctoring/exam/${examId}/my-status`);
	return response.data;
};

export const getExamStatus = async (sessionId) => {
	const response = await proctoringApi.get('/api/proctoring/exam/status', {
		params: { session_id: sessionId },
	});
	return response.data;
};

export const submitExam = async (sessionId) => {
	const response = await proctoringApi.post('/api/proctoring/submission/submit', {
		session_id: sessionId,
	});
	return response.data;
};

// Keep this export for current UI usage; backend uses submit to end session.
export const endExamSession = async (sessionId) => submitExam(sessionId);

export const getExamReport = async (sessionId) => {
	try {
		const response = await proctoringApi.get(`/api/proctoring/exam/report/${sessionId}`);
		return response.data;
	} catch (primaryErr) {
		const fallback = await proctoringApi.get(`/api/proctoring/submission/report/${sessionId}`);
		return fallback.data;
	}
};

export const getProctoringReport = async ({ examId, studentId, sessionId }) => {
	if (examId && studentId) {
		const response = await proctoringApi.get('/api/proctoring/proctor/report', {
			params: {
				exam_id: examId,
				student_id: studentId,
			},
		});
		return response.data?.report || response.data;
	}

	if (sessionId) {
		return getExamReport(sessionId);
	}

	throw new Error('getProctoringReport requires examId+studentId or sessionId');
};

export const getExamStudentsWithReports = async (examId) => {
	const response = await proctoringApi.get(`/api/proctoring/exam/${examId}/students/reports`);
	return response.data;
};

export const checkAgentRunning = async () => {
	const response = await axios.get(`${PROCTOR_AGENT.BASE_URL}/`, {
		timeout: 5000,
	});

	const message = response?.data?.message;
	const isRunning =
		typeof message === 'string' &&
		message.toLowerCase().includes('neuroiq proctoring agent is running');

	return {
		agent_running: isRunning,
		message,
	};
};

export const startProctoringAgent = async (sessionId, _studentId, examId) => {
	const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
	const headers = {
		'Content-Type': 'application/json',
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await axios.post(
		`${PROCTOR_AGENT.BASE_URL}/start-proctoring`,
		{
			// Local agent derives student_id from JWT; only session_id and exam_id are required in body
			session_id: sessionId,
			exam_id: examId,
		},
		{
			timeout: 15000,
			headers,
		}
	);

	return response.data;
};

export const getAgentStatus = async () => {
	const response = await axios.get(`${PROCTOR_AGENT.BASE_URL}/status`, {
		timeout: 8000,
	});
	return response.data;
};

export const checkAgentConnected = async (sessionId) => {
	const status = await getAgentStatus();
	const sameSession = !sessionId || status?.session_id === sessionId;
	return {
		agent_connected: Boolean(status?.agent_running && status?.socketio_connected && sameSession),
		agent_running: Boolean(status?.agent_running),
		socketio_connected: Boolean(status?.socketio_connected),
		session_id: status?.session_id || null,
	};
};

export const stopProctoringAgent = async () => {
	const response = await axios.post(
		`${PROCTOR_AGENT.BASE_URL}/stop-proctoring`,
		{},
		{
			timeout: 10000,
			headers: { 'Content-Type': 'application/json' },
		}
	);
	return response.data;
};

