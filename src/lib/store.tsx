import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Profile,
  SkillAnalysis,
  QuestionnaireAnswer,
  ValidationResult,
  RoadmapPhase,
} from './mockAI';
import { AuthSession, getSession } from './auth';
import { hasApiKey } from './geminiAI';

export interface TalyntraState {
  profile: Profile;
  cvFile: { name: string; size: number } | null;
  cvParsing: boolean;
  cvParsed: boolean;
  skills: SkillAnalysis | null;
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
        return { ...parsed, auth: session, aiConnected: hasApiKey() };
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
      questionnaire: [],
      validation: null,
      roadmap: null,
      auth: session,
      aiConnected: hasApiKey(),
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
    setState((s) => ({ ...s, skills }));

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
      const updated = s.roadmap.map((phase) => {
        if (phase.phase !== phaseNum) return phase;
        return {
          ...phase,
          actions: phase.actions.map((act) =>
            act.id === actionId ? { ...act, completed: !act.completed } : act
          ),
        };
      });
      return { ...s, roadmap: updated };
    });

  const setAuth = (session: AuthSession | null) =>
    setState((s) => ({
      ...s,
      auth: session,
      profile: session ? { ...s.profile, fullName: s.profile.fullName || session.fullName } : s.profile,
    }));

  const refreshAiStatus = () =>
    setState((s) => ({ ...s, aiConnected: hasApiKey() }));

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      profile: DEFAULT_PROFILE,
      cvFile: null,
      cvParsing: false,
      cvParsed: false,
      skills: null,
      questionnaire: [],
      validation: null,
      roadmap: null,
      auth: getSession(),
      aiConnected: hasApiKey(),
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

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
