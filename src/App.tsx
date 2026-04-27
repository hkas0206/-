/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Settings, 
  Shuffle, 
  Trash2, 
  Copy, 
  Check, 
  RotateCcw,
  LayoutGrid,
  UserPlus,
  FileUp
} from 'lucide-react';

type GroupMode = 'count' | 'size';

interface Member {
  deptCode: string;
  deptName: string;
  empId: string;
  empName: string;
}

interface Group {
  id: number;
  name: string;
  members: Member[];
}

export default function App() {
  const [inputText, setInputText] = useState('D01 管理部 001 陳小明\nD01 管理部 002 張偉\nD02 研發部 003 李娜\nD02 研發部 004 王芳\nD03 市場部 005 劉洋\nD03 市場部 006 趙靜\nD04 財務部 007 孫權\nD04 財務部 008 周梅\nD05 資訊部 009 吳強\nD05 資訊部 010 鄭濤\nD06 業務部 011 馮磊\nD06 業務部 012 褚衛');
  const [groupMode, setGroupMode] = useState<GroupMode>('count');
  const [groupValue, setGroupValue] = useState(3);
  const [groups, setGroups] = useState<Group[]>([]);
  const [copied, setCopied] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  const memberList = useMemo((): Member[] => {
    return inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(/\s+/);
        return {
          deptCode: parts[0] || '',
          deptName: parts[1] || '',
          empId: parts[2] || '',
          empName: parts.slice(3).join(' ') || parts[0] || 'Unknown'
        };
      });
  }, [inputText]);

  const handleGroup = useCallback(() => {
    if (memberList.length === 0) return;

    setIsShuffling(true);
    
    setTimeout(() => {
      const shuffled = [...memberList].sort(() => Math.random() - 0.5);
      const newGroups: Group[] = [];
      
      let numGroups = 0;
      if (groupMode === 'count') {
        numGroups = Math.min(groupValue, memberList.length);
      } else {
        numGroups = Math.ceil(memberList.length / groupValue);
      }

      for (let i = 0; i < numGroups; i++) {
        newGroups.push({
          id: i + 1,
          name: `第 ${i + 1} 組`,
          members: []
        });
      }

      shuffled.forEach((member, index) => {
        newGroups[index % numGroups].members.push(member);
      });

      setGroups(newGroups);
      setIsShuffling(false);
    }, 600);
  }, [memberList, groupMode, groupValue]);

  const handleCopy = async () => {
    const text = groups
      .map(g => `【${g.name}】\n${g.members.map(m => `${m.empId} ${m.empName}`).join('、')}`)
      .join('\n\n');
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const clearInput = () => {
    setInputText('');
    setGroups([]);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (!data) return;

      let newLines: string[] = [];

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const content = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
        newLines = content
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0);
      } else {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        newLines = jsonData
          .filter(row => row && row.length > 0)
          .map(row => row.join(' ').trim())
          .filter(line => line.length > 0);
      }
      
      if (newLines.length > 0) {
        const currentLines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const combined = [...new Set([...currentLines, ...newLines])].join('\n');
        setInputText(combined);
      }
    };

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    
    e.target.value = '';
  };

  const handleExportCSV = () => {
    if (groups.length === 0) return;
    
    let csvContent = "\uFEFF組別,單位代號,單位名稱,員工號,員工姓名\n";
    groups.forEach(g => {
      g.members.forEach(m => {
        csvContent += `"${g.name}","${m.deptCode}","${m.deptName}","${m.empId}","${m.empName}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `分組結果_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (groups.length === 0) return;

    const data = [];
    data.push(["組別", "單位代號", "單位名稱", "員工號", "員工姓名"]);
    groups.forEach(g => {
      g.members.forEach(m => {
        data.push([g.name, m.deptCode, m.deptName, m.empId, m.empName]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "分組結果");
    XLSX.writeFile(wb, `分組結果_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#FFFBFA] p-4 md:p-8 flex justify-center items-center">
      <div className="max-w-[1280px] w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Title & Settings */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Title Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bento-card border-[#000] bg-gradient-to-br from-[#FEF1F2] to-[#FFFBEB] md:col-span-2 min-h-[160px] flex-row items-center justify-between p-8"
          >
            <div className="flex-1">
              <div className="inline-block px-3 py-1 bg-white border-2 border-black rounded-full text-xs font-black mb-3 italic">BENTO v3.0</div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-black mb-2 font-display uppercase italic">活動分組小幫手</h1>
              <p className="font-bold text-black/60 text-lg">快速、隨機、優雅的資料配對系統 ✨</p>
            </div>
            <div className="text-6xl hidden sm:block grayscale-0 drop-shadow-lg">🍭</div>
          </motion.div>

          {/* Stats Summary */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bento-card bg-[#F0FDF4] border-black md:col-span-1 flex-row items-center justify-around py-8"
          >
             <div className="text-center">
              <div className="text-4xl font-black text-black">{memberList.length}</div>
              <div className="text-xs uppercase font-black text-black/40 mt-1">Total Members</div>
            </div>
            <div className="w-1 h-12 bg-black/10 rounded-full" />
            <div className="text-center">
              <div className="text-4xl font-black text-black">{groups.length || '--'}</div>
              <div className="text-xs uppercase font-black text-black/40 mt-1">Total Groups</div>
            </div>
          </motion.div>

          {/* Settings Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bento-card bg-gradient-to-tr from-[#FFFBEB] to-[#FEF1F2] border-black md:col-span-1 border-2"
          >
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-black font-display italic">
              <Settings className="w-6 h-6" /> 配置參數
            </h2>
            
            <div className="space-y-6 flex-1 text-black">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-black/40">分組模式</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/5 rounded-2xl border-2 border-black/10">
                  <button
                    onClick={() => setGroupMode('count')}
                    className={`py-3 rounded-xl text-xs font-black transition-all ${
                      groupMode === 'count' ? 'bg-black text-white shadow-lg' : 'text-black/60 hover:text-black'
                    }`}
                  >
                    指定組數
                  </button>
                  <button
                    onClick={() => setGroupMode('size')}
                    className={`py-3 rounded-xl text-xs font-black transition-all ${
                      groupMode === 'size' ? 'bg-black text-white shadow-lg' : 'text-black/60 hover:text-black'
                    }`}
                  >
                    每組人數
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-black/40">
                    {groupMode === 'count' ? '期望分為幾組？' : '每組多少人？'}
                  </label>
                  <span className="text-3xl font-black font-display italic">{groupValue}</span>
                </div>
                <input 
                  type="range"
                  min="2"
                  max={Math.max(2, memberList.length)}
                  value={groupValue}
                  onChange={(e) => setGroupValue(parseInt(e.target.value))}
                  className="w-full h-3 bg-black/10 rounded-full appearance-none cursor-pointer accent-black border-2 border-black/5"
                />
              </div>
            </div>

            <button
              onClick={handleGroup}
              disabled={memberList.length < 2 || isShuffling}
              className="w-full mt-8 py-5 bg-black text-white rounded-2xl text-lg font-black flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:bg-black/20 shadow-xl"
            >
              <Shuffle className={`w-6 h-6 ${isShuffling ? 'animate-spin' : ''}`} />
              {isShuffling ? '正在匹配中...' : '開始自動分組'}
            </button>
          </motion.div>

          {/* Results Overview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bento-card bg-white border-black md:col-span-2 min-h-[400px]"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black flex items-center gap-3 font-display italic uppercase">
                <LayoutGrid className="w-8 h-8 text-[#FB7185]" /> 分組結果
              </h2>
              {groups.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-2 py-3 px-6 rounded-2xl border-2 border-black transition-all font-black text-sm ${
                      copied ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-black hover:bg-black hover:text-white'
                    }`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    <span>{copied ? '已複製' : '一鍵複製'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide">
              {groups.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-black/10 py-20 pointer-events-none">
                  <LayoutGrid className="w-24 h-24 mb-4" />
                  <p className="text-2xl font-black italic">AWAITING INPUT...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence mode="popLayout">
                    {groups.map((group) => (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="p-6 bg-[#FAFAFA] border-2 border-black/10 rounded-[20px] hover:border-black transition-colors group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-black/5 rounded-bl-full flex items-center justify-end p-2 pr-4 pt-4 text-xs font-black opacity-20 group-hover:opacity-100 transition-opacity">#{group.id}</div>
                        <div className="font-black text-xl mb-4 flex items-center gap-2">
                          <span className="w-2 h-6 bg-black rounded-full" />
                          {group.name}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.members.map((m, midx) => (
                            <span key={midx} className="px-3 py-1.5 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              {m.empName} <span className="opacity-30 ml-1">#{m.empId}</span>
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {groups.length > 0 && (
              <div className="mt-8 pt-6 border-t-2 border-black/5 grid grid-cols-2 gap-4">
                <button 
                  onClick={handleExportCSV} 
                  className="py-4 border-2 border-black rounded-2xl font-black text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-[-2px] hover:translate-y-0"
                >
                  <FileUp className="w-5 h-5 rotate-180" /> CSV 匯出
                </button>
                <button 
                  onClick={handleExportExcel} 
                  className="py-4 border-2 border-black rounded-2xl font-black text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-[-2px] hover:translate-y-0"
                >
                  <FileUp className="w-5 h-5 rotate-180" /> EXCEL 匯出
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Member List Card */}
        <div className="lg:col-span-4 sticky top-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bento-card border-black bg-white h-[calc(100vh-6rem)]"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black flex items-center gap-3 font-display italic">
                  <Users className="w-6 h-6 text-[#6366F1]" /> 匯入名單
                </h2>
                <div className="flex gap-2 items-center">
                  <label 
                    className="flex items-center gap-2 cursor-pointer text-black hover:bg-black hover:text-white border-2 border-black transition-all py-1.5 px-3 rounded-xl font-black text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>匯入檔案</span>
                    <input type="file" accept=".txt,.csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <button onClick={clearInput} className="p-2 border-2 border-black rounded-xl hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Data Table Header */}
              <div className="grid grid-cols-4 gap-1 mb-2 px-2 py-3 bg-[#FAFAFA] border-2 border-black rounded-xl font-black text-[10px] text-black/40 tracking-tighter uppercase">
                <div>單位代號</div>
                <div>單位名稱</div>
                <div>員工號</div>
                <div>員工姓名</div>
              </div>

              {/* Data Scroll Area */}
              <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
                {memberList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-black/10 text-center px-4">
                    <UserPlus className="w-16 h-16 mb-4" />
                    <p className="text-sm font-black italic">PASTE DATA OR<br/>UPLOAD FILE</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {memberList.map((m, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-1 px-2 py-3 border-2 border-transparent hover:border-black hover:bg-[#FFFBEB] rounded-xl transition-all font-black text-[10px] group">
                        <div className="truncate text-black opacity-40 group-hover:opacity-100">{m.deptCode || '--'}</div>
                        <div className="truncate text-black/60 group-hover:text-black">{m.deptName || '--'}</div>
                        <div className="truncate font-display italic text-[#6366F1]">{m.empId || '--'}</div>
                        <div className="truncate text-black font-extrabold">{m.empName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Input Area Toggle */}
              <div className="mt-auto">
                <div className="flex items-center justify-between mb-2">
                   <label className="text-[10px] font-black uppercase text-black/40">Raw Input Editor</label>
                   <span className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-black">{memberList.length} ITEMS</span>
                </div>
                <textarea
                  className="w-full h-40 p-4 rounded-2xl border-2 border-black bg-[#FAFAFA] focus:bg-white focus:border-[#6366F1] transition-all resize-none font-bold text-xs text-slate-700 outline-none placeholder:text-black/20"
                  placeholder="單位代號 單位名稱 員工號 員工姓名..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
