import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Profile,
  SkillAnalysis,
  QuestionnaireAnswer,
  ValidationResult,
  RoadmapPhase,
  RoadmapAction,
  Skill,
} from './mockAI';
import { EvidenceGraph, addVerifiedTaskToGraph } from './evidenceGraph';
import { AuthSession, getSession } from './auth';
import { isServerAiConfigured } from './geminiAI';

export interface TalyntraState {
  profile: Profile;
  cvFile: { name: string; size: number } | null;
  cvParsing: boolean;
  cvParsed: boolean;
  skills: SkillAnalysis | null;
  evidenceGraph: EvidenceGraph | null;
  questionnaire: QuestionnaireAnswer[];
  validation: ValidationResult | null;
  roadmap: RoadmapPhase[] | null;
  auth: AuthSession | null;
  aiConnected: boolean;
}

const DEFAULT_PROFILE: Profile = {
  fullName: '',
  targetRole: '',
  experience: '',
  location: '',
  linkedIn: '',
  fileName: '',
};

const STORAGE_KEY = 'talyntra_state_v3';

interface StoreContextType {
  state: TalyntraState;
  setProfile: (p: Partial<Profile>) => void;
  setCvFile: (file: { name: string; size: number } | null) => void;
  setCvParsing: (val: boolean) => void;
  setCvParsed: (val: boolean) => void;
  setSkills: (skills: SkillAnalysis | null) => void;
  setEvidenceGraph: (graph: EvidenceGraph | null) => void;
  setQuestionnaire: (answers: QuestionnaireAnswer[]) => void;
  addQuestionnaireAnswer: (answer: QuestionnaireAnswer) => void;
  setValidation: (val: ValidationResult | null) => void;
  setRoadmap: (rm: RoadmapPhase[] | null) => void;
  toggleRoadmapAction: (phaseNum: number, actionId: string) => void;
  setAuth: (session: AuthSession | null) => void;
  refreshAiStatus: () => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TalyntraState>(() => {
    const session = getSession();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          auth: session,
          aiConnected: isServerAiConfigured(),
          evidenceGraph: parsed.skills?.evidenceGraph || parsed.evidenceGraph || null,
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved state:', e);
    }
    return {
      profile: session ? { ...DEFAULT_PROFILE, fullName: session.fullName } : DEFAULT_PROFILE,
      cvFile: null,
      cvParsing: false,
      cvParsed: false,
      skills: null,
      evidenceGraph: null,
      questionnaire: [],
      validation: null,
      roadmap: null,
      auth: session,
      aiConnected: isServerAiConfigured(),
    };
  });

  useEffect(() => {
    try {
      // Don't persist auth or aiConnected — derive them
      const { auth: _a, aiConnected: _b, ...rest } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }, [state]);

  const setProfile = (p: Partial<Profile>) =>
    setState((s) => ({ ...s, profile: { ...s.profile, ...p } }));

  const setCvFile = (file: { name: string; size: number } | null) =>
    setState((s) => ({ ...s, cvFile: file }));

  const setCvParsing = (val: boolean) =>
    setState((s) => ({ ...s, cvParsing: val }));

  const setCvParsed = (val: boolean) =>
    setState((s) => ({ ...s, cvParsed: val }));

  const setSkills = (skills: SkillAnalysis | null) =>
    setState((s) => ({
      ...s,
      skills,
      evidenceGraph: skills?.evidenceGraph || s.evidenceGraph || null,
    }));

  const setEvidenceGraph = (graph: EvidenceGraph | null) =>
    setState((s) => ({ ...s, evidenceGraph: graph }));

  const setQuestionnaire = (answers: QuestionnaireAnswer[]) =>
    setState((s) => ({ ...s, questionnaire: answers }));

  const addQuestionnaireAnswer = (ans: QuestionnaireAnswer) =>
    setState((s) => {
      const filtered = s.questionnaire.filter((q) => q.questionId !== ans.questionId);
      return { ...s, questionnaire: [...filtered, ans] };
    });

  const setValidation = (val: ValidationResult | null) =>
    setState((s) => ({ ...s, validation: val }));

  const setRoadmap = (rm: RoadmapPhase[] | null) =>
    setState((s) => ({ ...s, roadmap: rm }));

  const toggleRoadmapAction = (phaseNum: number, actionId: string) =>
    setState((s) => {
      if (!s.roadmap) return s;
      let toggledAction: RoadmapAction | undefined;

      const updatedRoadmap = s.roadmap.map((phase) => {
        if (phase.phase !== phaseNum) return phase;
        return {
          ...phase,
          actions: phase.actions.map((act) => {
            if (act.id === actionId) {
              const nextCompleted = !act.completed;
              toggledAction = { ...act, completed: nextCompleted };
              return toggledAction;
            }
            return act;
          }),
        };
      });

      // Live feedback loop into Evidence Graph
      let updatedGraph = s.evidenceGraph;
      let updatedSkills = s.skills;

      if (toggledAction && toggledAction.verifiesSkill && toggledAction.completed && updatedGraph) {
        updatedGraph = addVerifiedTaskToGraph(
          updatedGraph,
          toggledAction.verifiesSkill,
          toggledAction.text,
          toggledAction.id
        );

        if (updatedSkills) {
          const detectedSkills: Skill[] = Object.values(updatedGraph.skillClaims).map((claim) => {
            const linked = claim.linkedEvidenceIds
              .map((id) => updatedGraph!.evidenceNodes[id])
              .filter(Boolean);

            return {
              name: claim.skillName,
              category: claim.category,
              claimedLevel: claim.claimedLevel,
              evidencedLevel: claim.evidencedLevel,
              proficiency: claim.confidenceScore ?? 0,
              confidenceStatus: claim.confidenceStatus,
              evidenceCount: linked.length,
              timeDecayFactor: claim.timeDecayFactor,
              daysElapsed: claim.daysElapsed,
              lastDemonstratedDate: claim.lastDemonstratedDate,
              reasoning: claim.reasoning,
              claimId: claim.id,
              linkedEvidence: linked,
            };
          });

          updatedSkills = {
            ...updatedSkills,
            detectedSkills,
            overallScore: updatedGraph.overallMatchScore ?? updatedSkills.overallScore,
            evidenceGraph: updatedGraph,
          };
        }
      }

      return {
        ...s,
        roadmap: updatedRoadmap,
        evidenceGraph: updatedGraph,
        skills: updatedSkills,
      };
    });

  const setAuth = (session: AuthSession | null) =>
    setState((s) => ({
      ...s,
      auth: session,
      profile: session
        ? { ...s.profile, fullName: s.profile.fullName || session.fullName }
        : s.profile,
    }));

  const refreshAiStatus = () =>
    setState((s) => ({ ...s, aiConnected: isServerAiConfigured() }));

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      profile: DEFAULT_PROFILE,
      cvFile: null,
      cvParsing: false,
      cvParsed: false,
      skills: null,
      evidenceGraph: null,
      questionnaire: [],
      validation: null,
      roadmap: null,
      auth: null,
      aiConnected: isServerAiConfigured(),
    });
  };

  return (
    <StoreContext.Provider
      value={{
        state,
        setProfile,
        setCvFile,
        setCvParsing,
        setCvParsed,
        setSkills,
        setEvidenceGraph,
        setQuestionnaire,
        addQuestionnaireAnswer,
        setValidation,
        setRoadmap,
        toggleRoadmapAction,
        setAuth,
        refreshAiStatus,
        resetAll,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
