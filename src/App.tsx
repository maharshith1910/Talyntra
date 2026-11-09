import { Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Upload from './pages/Upload';
import Skills from './pages/Skills';
import Questionnaire from './pages/Questionnaire';
import Validation from './pages/Validation';
import Roadmap from './pages/Roadmap';
import Chat from './pages/Chat';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/skills" element={<Skills />} />
      <Route path="/questionnaire" element={<Questionnaire />} />
      <Route path="/validation" element={<Validation />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
