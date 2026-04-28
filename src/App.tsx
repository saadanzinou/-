import React, { useState, useRef } from 'react';
import { Upload, FileText, ChevronRight, ChevronLeft, Camera, Trash2, Plus, CheckCircle, AlertCircle, Languages, BookOpen, Loader2, History, Clock } from 'lucide-react';
import { Language, getTranslation } from './lib/i18n';
import { gradeExam, ExamResult } from './lib/gemini';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type Step = 1 | 2 | 3;

interface AnswerKeyData {
  files: File[];
  rubricText: string;
}

interface StudentSubmission {
  id: string;
  name: string;
  files: File[];
  result?: ExamResult;
  isGrading: boolean;
  error?: string;
}

interface HistorySession {
  id: string;
  date: Date;
  studentsGraded: number;
  students: { name: string; result?: ExamResult }[];
}

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [step, setStep] = useState<Step>(1);
  
  const [answerKey, setAnswerKey] = useState<AnswerKeyData>({ files: [], rubricText: '' });
  const [students, setStudents] = useState<StudentSubmission[]>([
    { id: '1', name: '', files: [], isGrading: false }
  ]);
  const [activeStudentId, setActiveStudentId] = useState<string>('1');
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const t = getTranslation(lang);
  const isRTL = lang === 'ar';

  const handleLanguageToggle = () => {
    setLang(prev => prev === 'ar' ? 'fr' : prev === 'fr' ? 'en' : 'ar');
  };

  const handleNextStep = () => {
    if (step < 3) setStep((s) => (s + 1) as Step);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const startGrading = async () => {
    handleNextStep();
    
    // Grade all students that have files but no result yet
    const studentsToGrade = students.filter(s => s.files.length > 0 && !s.result && !s.isGrading);
    const gradedStudents: { name: string; result?: ExamResult }[] = [];
    
    for (const student of studentsToGrade) {
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isGrading: true, error: undefined } : s));
      
      try {
        const result = await gradeExam(answerKey.files, answerKey.rubricText, student.files, lang);
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, result, isGrading: false } : s));
        gradedStudents.push({ name: student.name || `طالب ${studentsToGrade.indexOf(student) + 1}`, result });
      } catch (error) {
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isGrading: false, error: t.error } : s));
      }
    }

    if (gradedStudents.length > 0) {
      setHistory(prev => [{
        id: Date.now().toString(),
        date: new Date(),
        studentsGraded: gradedStudents.length,
        students: gradedStudents,
      }, ...prev]);
    }
  };

  const activeStudent = students.find(s => s.id === activeStudentId) || students[0];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden md:border-8 md:border-slate-950">
      {/* Header */}
      <header className="bg-slate-800/50 border border-slate-700/50 sticky top-4 z-10 mx-4 md:mx-auto max-w-5xl rounded-2xl p-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-indigo-400">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-white">{t.appTitle}</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{t.appSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button 
              onClick={() => setShowHistory(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1 text-xs font-bold rounded-md hover:text-white transition-colors text-slate-400"
            >
              <History className="w-4 h-4" />
              {showHistory ? t.back : t.viewHistory}
            </button>
            <button 
              onClick={handleLanguageToggle}
              className="flex items-center gap-2 px-3 py-1 text-xs font-bold bg-slate-700 text-white rounded-md"
            >
              <Languages className="w-4 h-4" />
              {lang.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {showHistory ? (
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                <History className="w-6 h-6 text-indigo-400" />
              </div>
              <span className="text-white">{t.historyTitle}</span>
            </h2>
            <button 
              onClick={() => {
                setShowHistory(false);
                setStep(1);
                setStudents([{ id: Date.now().toString(), name: '', files: [], isGrading: false }]);
                setAnswerKey({ files: [], rubricText: '' });
              }}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 font-bold hover:bg-indigo-500 transition-colors pointer-events-auto"
            >
              <Plus className="w-5 h-5" />
              {t.newSession}
            </button>
          </div>

          <div className="space-y-6">
            {history.length === 0 ? (
              <div className="text-center py-20 bg-slate-800/40 rounded-3xl border-2 border-slate-700/50">
                <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">{t.noHistory}</p>
              </div>
            ) : (
              history.map(session => (
                <div key={session.id} className="bg-slate-800/40 rounded-3xl border border-slate-700/50 p-6 md:p-8 hover:bg-slate-800/60 transition-colors">
                  <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-700">
                    <div>
                      <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-widest">{t.date}</p>
                      <p className="font-bold text-white text-xl">{session.date.toLocaleString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-widest">{t.studentsGraded}</p>
                      <p className="font-black text-indigo-400 text-3xl">{session.studentsGraded}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {session.students.map((st, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                        <span className="font-bold text-slate-300">{st.name}</span>
                        {st.result ? (
                          <span className="font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm">
                            {st.result.score} / {st.result.totalPoints}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">Failed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      ) : (
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-800 -z-10" />
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-indigo-600 -z-10 transition-all duration-500" style={{ width: `${(step - 1) * 50}%` }} />
            
            {[
              { num: 1, label: t.step1 },
              { num: 2, label: t.step2 },
              { num: 3, label: t.step3 }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-2 bg-slate-900 px-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shadow-sm",
                  step >= s.num ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-500 border-2 border-slate-700",
                  step === s.num && "ring-4 ring-indigo-500/20 bg-indigo-600 text-white border-none"
                )}>
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                </div>
                <span className={cn("text-xs font-medium uppercase tracking-widest", step >= s.num ? "text-slate-300" : "text-slate-600")}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-slate-800/40 rounded-3xl border-2 border-indigo-500/20 p-6 md:p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <SetupStep 
                  data={answerKey} 
                  onChange={setAnswerKey} 
                  t={t} 
                  isRTL={isRTL}
                />
              )}
              {step === 2 && (
                <UploadStep 
                  students={students}
                  setStudents={setStudents}
                  activeStudentId={activeStudentId}
                  setActiveStudentId={setActiveStudentId}
                  t={t}
                  isRTL={isRTL}
                />
              )}
              {step === 3 && (
                <ResultsStep 
                  students={students}
                  activeStudentId={activeStudentId}
                  setActiveStudentId={setActiveStudentId}
                  t={t}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handlePrevStep}
            disabled={step === 1}
            className={cn(
              "px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2",
              step === 1 ? "opacity-0 pointer-events-none" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-700"
            )}
          >
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {t.back}
          </button>

          {step === 1 && (
            <button
              onClick={handleNextStep}
              className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              {t.next}
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={startGrading}
              disabled={students.every(s => s.files.length === 0)}
              className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {t.startGrading}
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </main>
      )}
    </div>
  );
}

// Subcomponents

function SetupStep({ data, onChange, t, isRTL }: { data: AnswerKeyData, onChange: (d: AnswerKeyData) => void, t: any, isRTL: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onChange({ ...data, files: [...data.files, ...Array.from(e.target.files as ArrayLike<File>)] });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...data.files];
    newFiles.splice(index, 1);
    onChange({ ...data, files: newFiles });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">{t.step1}</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* File Upload Area */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-300">{t.uploadAnswerKey}</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-500/40 rounded-3xl p-8 hover:bg-slate-800 transition-colors cursor-pointer flex flex-col items-center justify-center text-center gap-3 min-h-[200px]"
            >
              <div className="w-16 h-16 bg-indigo-600/10 text-indigo-400 rounded-full flex items-center justify-center mb-2">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-white">{t.dropFilesHere}</p>
                <p className="text-xs text-slate-400 mt-1">{t.supportedFiles}</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                multiple 
                accept="image/*,application/pdf"
              />
            </div>

            {data.files.length > 0 && (
              <div className="space-y-2">
                {data.files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-slate-800 border border-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-indigo-400" />
                      </div>
                      <span className="text-sm font-bold text-indigo-300 truncate">{file.name}</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-1 text-slate-500 hover:text-white transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Text Area */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-300">{t.orTypeRubric}</label>
            <textarea
              value={data.rubricText}
              onChange={(e) => onChange({ ...data, rubricText: e.target.value })}
              placeholder={t.rubricPlaceholder}
              className="w-full h-[200px] p-4 bg-slate-900/50 border border-slate-700/50 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-600 outline-none resize-none transition-all"
            />
            <div className="flex items-start gap-2 p-3 border border-dashed border-slate-600 bg-indigo-900/5 rounded-xl text-xs leading-relaxed">
              <p className="text-slate-400 italic">"{t.writtenExpressionRule}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadStep({ students, setStudents, activeStudentId, setActiveStudentId, t, isRTL }: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const activeStudentIndex = students.findIndex((s: any) => s.id === activeStudentId);
  const activeStudent = students[activeStudentIndex];

  const handleAddStudent = () => {
    const newId = Date.now().toString();
    setStudents([...students, { id: newId, name: '', files: [], isGrading: false }]);
    setActiveStudentId(newId);
  };

  const handleNameChange = (name: string) => {
    const updated = [...students];
    updated[activeStudentIndex].name = name;
    setStudents(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const updated = [...students];
      updated[activeStudentIndex].files = [
        ...updated[activeStudentIndex].files,
        ...Array.from(e.target.files as ArrayLike<File>)
      ];
      setStudents(updated);
    }
  };

  const removeFile = (index: number) => {
    const updated = [...students];
    updated[activeStudentIndex].files.splice(index, 1);
    setStudents(updated);
  };

  const removeStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (students.length === 1) return;
    const updated = students.filter((s: any) => s.id !== id);
    setStudents(updated);
    if (activeStudentId === id) {
      setActiveStudentId(updated[0].id);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 h-full min-h-[500px]">
      {/* Sidebar: Student List */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-300 uppercase tracking-widest text-sm">{t.step2}</h3>
          <button 
            onClick={handleAddStudent}
            className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors border border-indigo-500/30"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-2 overflow-y-auto max-h-[400px] pr-2">
          {students.map((student: any, i: number) => (
            <div 
              key={student.id}
              onClick={() => setActiveStudentId(student.id)}
              className={cn(
                "group px-4 py-3 rounded-2xl cursor-pointer flex items-center justify-between border-2 transition-all",
                activeStudentId === student.id 
                  ? "bg-slate-800 border-indigo-500 shadow-md" 
                  : "bg-slate-900 border-transparent hover:border-slate-700"
              )}
            >
              <div className="flex flex-col truncate">
                <span className={cn(
                  "text-sm font-bold truncate transition-colors",
                  activeStudentId === student.id ? "text-indigo-400" : "text-white group-hover:text-slate-300"
                )}>
                  {student.name || `طالب ${i + 1}`}
                </span>
                {student.files.length > 0 && (
                  <span className="text-xs text-slate-500">{student.files.length} files</span>
                )}
              </div>
              {students.length > 1 && (
                <button 
                  onClick={(e) => removeStudent(student.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Upload Area */}
      <div className="flex-1 flex flex-col bg-slate-900 rounded-3xl p-6 border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 opacity-20"></div>
        <input 
          type="text" 
          placeholder={t.studentName}
          value={activeStudent?.name || ''}
          onChange={(e) => handleNameChange(e.target.value)}
          className="text-2xl font-bold bg-transparent border-none outline-none placeholder-slate-600 mb-6 focus:ring-0 p-0 text-white"
        />

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-700 transition-all flex flex-col items-center justify-center gap-3 group"
          >
            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            {t.uploadExamPapers}
          </button>
          
          <button 
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-700 transition-all flex flex-col items-center justify-center gap-3 group"
          >
            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            {t.cameraPermission}
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
            accept="image/*,application/pdf"
          />
          <input 
            type="file" 
            ref={cameraInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            capture="environment"
            accept="image/*"
          />
        </div>

        {activeStudent?.files.length > 0 ? (
          <div className="space-y-3 overflow-y-auto flex-1">
            {activeStudent.files.map((file: File, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-800 rounded-2xl border border-slate-700">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-sm font-bold text-slate-300 truncate">{file.name}</span>
                </div>
                <button onClick={() => removeFile(i)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">{t.dropFilesHere}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsStep({ students, activeStudentId, setActiveStudentId, t }: any) {
  const activeStudent = students.find((s: any) => s.id === activeStudentId) || students[0];

  return (
    <div className="flex flex-col md:flex-row gap-8 h-full min-h-[500px]">
      {/* Sidebar: Student List */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        <h3 className="font-bold text-slate-300 uppercase tracking-widest text-sm mb-2">{t.step3}</h3>
        
        <div className="space-y-2 overflow-y-auto max-h-[400px] pr-2">
          {students.map((student: any, i: number) => (
            <div 
              key={student.id}
              onClick={() => setActiveStudentId(student.id)}
              className={cn(
                "px-4 py-3 rounded-2xl cursor-pointer flex flex-col gap-1 border-2 transition-all",
                activeStudentId === student.id 
                  ? "bg-slate-800 border-indigo-500 shadow-md" 
                  : "bg-slate-900 border-transparent hover:border-slate-700"
              )}
            >
              <span className={cn(
                "text-sm font-bold truncate transition-colors",
                activeStudentId === student.id ? "text-indigo-400" : "text-white group-hover:text-slate-300"
              )}>
                {student.name || `طالب ${i + 1}`}
              </span>
              <div className="flex items-center gap-2">
                {student.isGrading ? (
                  <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Processing
                  </span>
                ) : student.error ? (
                  <span className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Error
                  </span>
                ) : student.result ? (
                  <span className="text-[10px] bg-green-500/10 text-green-400 px-2 pl-0 rounded-full font-bold border border-green-500/20">
                    <span className="bg-green-500 w-1.5 h-1.5 rounded-full inline-block mx-1.5" />
                    {student.result.score} / {student.result.totalPoints}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">No data</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Results Area */}
      <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-700/50 overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-500 opacity-20"></div>

        {activeStudent?.isGrading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <h3 className="font-bold text-white text-lg">{t.gradingInProgress}</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">This can take up to a minute as AI analyzes the handwritten text and compares with the rubric.</p>
          </div>
        ) : activeStudent?.error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="font-bold text-white text-lg">{t.error}</h3>
            <p className="text-sm text-red-400 mt-2">{activeStudent.error}</p>
          </div>
        ) : activeStudent?.result ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start mb-8 pb-8 border-b border-slate-700/50">
              <div className="text-center p-6 bg-slate-800 rounded-3xl border border-slate-700 shrink-0 min-w-[160px]">
                <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-widest">{t.score}</p>
                <div className="flex items-baseline justify-center gap-1 text-white">
                  <span className="text-5xl font-black">{activeStudent.result.score}</span>
                  <span className="text-xl font-bold text-slate-500 mb-1">/ {activeStudent.result.totalPoints}</span>
                </div>
              </div>
              
              <div className="flex-1">
                <h4 className="font-bold text-white text-lg mb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  {t.feedback}
                </h4>
                <p className="text-slate-300 leading-relaxed text-sm">
                  {activeStudent.result.feedback}
                </p>
              </div>
            </div>

            <h4 className="font-bold text-white text-lg mb-6">{t.questionBreakdown}</h4>
            <div className="space-y-4">
              {activeStudent.result.questionBreakdown.map((q: any, i: number) => (
                <div key={i} className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-white">{q.question}</span>
                    <span className={cn(
                      "font-bold text-sm px-3 py-1 rounded-full border",
                      q.score === q.maxScore ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      q.score > 0 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      {q.score} / {q.maxScore}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{q.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">No results yet. Start grading to see results.</p>
          </div>
        )}
      </div>
    </div>
  );
}

