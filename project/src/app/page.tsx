"use client";

import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';
import jsPDF from 'jspdf';

// Conexão com Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [nf, setNf] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [volumes, setVolumes] = useState(1);
  const [message, setMessage] = useState('');
  
  const handleNfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chave = e.target.value;
    if (chave.length === 44) {
      const nfExtraido = chave.slice(30, 36);
      setNf(nfExtraido);
    }
  };

  const handleEtiquetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const etq = e.target.value;
    if (etq.length === 19) {
      const nfEtiqueta = etq.slice(9, 15);
      if (nfEtiqueta === nf) {
        setMessage('OK');
      } else {
        setMessage('Erro: NF divergente');
        new Audio('/erro.mp3').play();
      }
    }
  };

  const handleSave = async () => {
    await supabase
      .from('conferencias')
      .insert([{ nf_numero: nf, volumes }]);

    setMessage('Salvo com sucesso!');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Conferência", 10, 10);
    doc.text(`Nota Fiscal: ${nf} | Quantidade de volumes: ${volumes}`, 10, 20);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 10, 30);
    doc.text('Nome: ________________', 10, 40);
    doc.text('RG: __________________', 10, 50);
    doc.text('Placa: _______________', 10, 60);
    doc.text('Assinatura: ___________', 10, 70);
    doc.save('relatorio_conferencia.pdf');
  };

  return (
    <div className="main-container">
      <div className="content">
        <h1>Conferência de Expedição</h1>
        <input type="text" placeholder="Bipe a chave da NF" onChange={handleNfChange} />
        <input type="text" placeholder="Bipe a etiqueta" onChange={handleEtiquetaChange} />
        <input type="number" placeholder="Quantidade de volumes" value={volumes} onChange={(e) => setVolumes(Number(e.target.value))} />
        <button onClick={handleSave}>Salvar</button>
        <button onClick={handleExportPDF}>Exportar Relatório</button>
        <p>{message}</p>
      </div>
    </div>
  );
}