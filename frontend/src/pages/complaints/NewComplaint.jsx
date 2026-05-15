import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Upload, ChevronRight } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import { complaintsAPI, configAPI } from '../../services/api';
import { SEVERITY_CONFIG } from '../../data/mockData';

const TYPES = ['Structural', 'Quality', 'Legal', 'Safety', 'Documentation', 'Maintenance', 'Financial', 'Other'];

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition";

export default function NewComplaint() {
  const { addComplaint } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [projects, setProjects] = useState([]);
  const [zones, setZones] = useState([]);
  const [sources, setSources] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    configAPI.enums().then(r => {
      if (r.success) {
        setProjects(r.data.projects || []);
        setZones(r.data.zones || []);
        setSources(r.data.sources || []);
        setDepartments(r.data.departments || []);
      }
    }).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    project: '', source: '', zone: '', type: '', severity: 'Medium',
    issueDetails: '', notes: '', department: '', customerName: '', customerEmail: '',
    mailThread: '', attachments: [],
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const runAi = async () => {
    setAiProcessing(true);
    try {
      const res = await complaintsAPI.aiClassify(form.issueDetails);
      if (res.success) {
        set('severity', res.data.severity);
        set('department', res.data.department);
        setAiDone(true);
      }
    } catch {
      // Fallback local classification
      const text = form.issueDetails.toLowerCase();
      let sev = 'Low';
      if (/legal|court|hazard|fire/.test(text)) sev = 'Fatal';
      else if (/leakage|damage|safety|exposed/.test(text)) sev = 'Critical';
      else if (/delay|defect|crack|broken/.test(text)) sev = 'Medium';
      let dept = 'Operations';
      if (/legal|court/.test(text)) dept = 'Legal';
      else if (/quality|tile|paint|floor/.test(text)) dept = 'Quality';
      set('severity', sev);
      set('department', dept);
      setAiDone(true);
    }
    setAiProcessing(false);
  };

  const handleSubmit = async () => {
    await addComplaint({
      ...form,
      raisedOn: new Date().toISOString(),
      status: 'Pending Validation',
      aiExtracted: { keywords: [], confidence: 0.9, suggestedSeverity: form.severity, suggestedDepartment: form.department },
      slaStarted: new Date().toISOString(),
    });
    navigate('/complaints');
  };

  return (
    <Layout title="New Complaint" subtitle="Manually log an escalation from any channel">
      <div className="max-w-3xl">
        {/* Steps */}
        <div className="flex items-center gap-3 mb-6">
          {['Complaint Details', 'AI Classification', 'Review & Submit'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${step === i + 1 ? '' : 'opacity-60'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === i + 1 ? 'bg-blue-600 text-white' : step > i + 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${step === i + 1 ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span>
              </div>
              {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Project" required>
                <select value={form.project} onChange={e => set('project', e.target.value)} className={inputCls}>
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Source" required>
                <select value={form.source} onChange={e => set('source', e.target.value)} className={inputCls}>
                  <option value="">Select source</option>
                  {sources.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Zone" required>
                <select value={form.zone} onChange={e => set('zone', e.target.value)} className={inputCls}>
                  <option value="">Select zone</option>
                  {zones.map(z => <option key={z}>{z}</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                  <option value="">Select type</option>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Customer Name">
                <input value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="John Doe" className={inputCls} />
              </Field>
              <Field label="Customer Email">
                <input type="email" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} placeholder="john@example.com" className={inputCls} />
              </Field>
            </div>
            <Field label="Issue Details" required>
              <textarea rows={4} value={form.issueDetails} onChange={e => set('issueDetails', e.target.value)}
                placeholder="Describe the escalation in detail — include relevant keywords (legal, hazard, leakage, etc.)"
                className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Notes / Context">
              <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional context, stakeholders involved…" className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Mail Thread Link">
              <input value={form.mailThread} onChange={e => set('mailThread', e.target.value)} placeholder="https://…" className={inputCls} />
            </Field>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
              <Upload className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Drag & drop attachments or <span className="text-blue-600 cursor-pointer">browse</span></p>
              <p className="text-[10px] text-slate-400 mt-1">PDF, images, mail exports — max 20MB</p>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setStep(2)} disabled={!form.project || !form.source || !form.issueDetails}>
                Next: AI Classification
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6">
            <div className="text-center py-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">AI Classification Engine</h3>
              <p className="text-xs text-slate-500 mt-1">Our AI will extract key fields and suggest severity + department routing</p>
            </div>
            {!aiDone && !aiProcessing && (
              <div className="bg-slate-50 rounded-xl p-4 mb-5 text-xs text-slate-600 leading-relaxed">
                <p className="font-medium text-slate-700 mb-1">Issue text:</p>
                <p className="italic">"{form.issueDetails}"</p>
              </div>
            )}
            {aiProcessing && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Analysing complaint and extracting structured data…</p>
              </div>
            )}
            {aiDone && (
              <div className="space-y-4 mb-5">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 mb-3 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI Suggested Classification</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Severity</p>
                      <select value={form.severity} onChange={e => set('severity', e.target.value)} className={inputCls}>
                        {['Fatal','Critical','Medium','Low'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Department</p>
                      <select value={form.department} onChange={e => set('department', e.target.value)} className={inputCls}>
                        <option value="">Select</option>
                        {departments.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] text-purple-600 mt-3">You can override AI suggestions above before submitting.</p>
                </div>
                {form.severity && (
                  <div className={`rounded-xl p-3 text-xs border ${SEVERITY_CONFIG[form.severity]?.color}`}>
                    <strong>SLA for {form.severity}:</strong>{' '}
                    Action start in {SEVERITY_CONFIG[form.severity]?.sla.actionStart}h ·
                    RCA within {SEVERITY_CONFIG[form.severity]?.sla.rca}h ·
                    Closure within {SEVERITY_CONFIG[form.severity]?.sla.closure}h
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              {!aiDone
                ? <Button variant="primary" icon={Sparkles} onClick={runAi} disabled={aiProcessing}>Run AI Analysis</Button>
                : <Button variant="primary" onClick={() => setStep(3)}>Review & Submit</Button>
              }
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Review Before Submission</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs mb-5">
              {[
                ['Project', form.project], ['Source', form.source], ['Zone', form.zone], ['Type', form.type],
                ['Severity', form.severity], ['Department', form.department],
                ['Customer', form.customerName], ['Email', form.customerEmail],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-400 w-24 flex-shrink-0">{k}</span>
                  <span className="font-medium text-slate-700">{v || '—'}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-5">
              <p className="font-medium text-slate-700 mb-1">Issue Details</p>
              <p className="leading-relaxed">{form.issueDetails}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 mb-5">
              Once submitted, this complaint will enter <strong>Pending Validation</strong> queue for human review before routing.
            </div>
            <div className="flex gap-3 justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button variant="primary" onClick={handleSubmit}>Submit Complaint</Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
