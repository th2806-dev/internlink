import { Navigate } from "react-router-dom";

/**
 * EvaluationsView shows either the dashboard list or the StudentWorkspace at the evaluation tab
 * depending on whether an internshipId is provided via URL params.
 */
export const EvaluationsView = () => <Navigate to="/lecturer/evaluation/grading" replace />;
