"use client";

import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';
import jsPDF from 'jspdf';
import Image from 'next/image';

// log de erro Supabase
console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("Supabase Anon Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Conexão com Supabase
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) 
  : null;
// Verificação para garantir que a conexão foi estabelecida corretamente
if (!supabase) {
  console.error('Erro ao conectar ao Supabase. Verifique as variáveis de ambiente.');
}

export default function Home() {
  const [nf, setNf] = useState('');
  // const [volumes, setVolumes] = useState(0);
  const [volumes, setVolumes] = useState<number | null>(null);
  const [volumesRestantes, setVolumesRestantes] = useState(0);
  const [message, setMessage] = useState('');
  const [conferencias, setConferencias] = useState<{ nf: string, volumes: number }[]>([]);
  const [bipandoVolumes, setBipandoVolumes] = useState(false);

  // Função para tratar a mudança da quantidade de volumes
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantidadeVolumes = Number(e.target.value);
    if (quantidadeVolumes > 0) {
      setVolumes(quantidadeVolumes);
      setVolumesRestantes(quantidadeVolumes);
      setMessage('Insira a chave da NF');
    } else {
      setVolumes(null);
      setMessage('Por favor, insira uma quantidade válida de volumes.');
    }
  };

  // Função para tratar a bipagem da chave NF
  const handleNfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chave = e.target.value;
    if (chave.length === 44 && volumes) { // Só permite bipar NF se volumes for inserido
      const nfExtraido = chave.slice(25, 34);
      setNf(nfExtraido);
      setMessage(`NF: ${nfExtraido}. Agora bip os volumes.`);
      setBipandoVolumes(true);
    } else if (!volumes) {
      setMessage('Por favor, insira a quantidade de volumes antes de bipar a NF.');
    }
  };

  // Função para bipar os volumes
  const handleEtiquetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const etq = e.target.value;
    if (etq.length === 19) {
      const nfEtiqueta = etq.slice(4, 13);
      if (nfEtiqueta === nf) {
        setVolumesRestantes(prev => prev - 1);
        if (volumesRestantes === 1) {
          setMessage('Todos os volumes bipados. Deseja incluir nova nota ou finalizar?');
          setBipandoVolumes(false);
          handleSave(); // Salvar conferência
        } else {
          setMessage(`Volume bipado. Restam ${volumesRestantes - 1} volumes.`);
        }
        //e.target.value = '';// Limpa o campo de bipagem após cada volume bipado
      } else {
        setMessage('Erro: NF divergente');
        new Audio('/erro.mp3').play();
      }
      e.target.value = ''; // Limpa o campo após bipar
    }
  };

// Função para salvar conferência no Supabase
const handleSave = async () => {
  if (!supabase) {
    setMessage('Erro: Supabase não está configurado.');
    return;
  }
  const novaConferencia = { nf, volumes: volumes as number, created_at: new Date().toISOString() };
  const { error } = await supabase
    .from('conferencias')
    .insert([novaConferencia]);

  if (error) {
    setMessage(`Erro ao salvar a conferência: ${error.message}`);
  } else {
    setConferencias(prev => [...prev, { nf, volumes: volumes as number }]);
    console.log('Conferências atuais:', [...conferencias, novaConferencia]);
    setMessage('Conferência salva com sucesso!');
  }
};

  // Função para gerar PDF do relatório
  const handleExportPDF = () => {
    console.log('Gerando PDF...');
    const doc = new jsPDF();

    // Adicionar logo no PDF
    const logo = '/logo.png'; // Ajuste o caminho da logo
    doc.addImage(logo, 'PNG', 10, 10, 50, 20);

    // Título e conferências
    doc.text("Relatório de Conferência", 10, 40);
    conferencias.forEach((conf, index) => {
      doc.text(`Nota Fiscal: ${conf.nf} | Quantidade de volumes: ${conf.volumes}`, 10, 50 + (index * 10));
    });

    // Rodapé com espaço para assinatura
    const finalLine = 50 + (conferencias.length * 10) + 20;
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 10, finalLine);
    doc.text('Nome: ________________', 10, finalLine + 10);
    doc.text('RG: __________________', 10, finalLine + 20);
    doc.text('Placa: _______________', 10, finalLine + 30);
    doc.text('Assinatura: ___________', 10, finalLine + 40);

    doc.save('relatorio_conferencia.pdf');
  };

  // Reset para nova nota fiscal
  const handleNovaNota = () => {
    setNf('');
    setVolumes(0);
    setVolumesRestantes(0);
    setMessage('Insira a quantidade de volumes');
  };

  return (
    <div className="main-container">
      <div className="content">
        {/* Logo da empresa */}
        <Image src="/logo.png" alt="Logo" width={200} height={200} />

        <h1>Conferência de Expedição</h1>
        {!bipandoVolumes ? (
          <>
            <input type="number" placeholder="Quantidade de volumes" onChange={handleVolumeChange} />
            <input type="text" placeholder="Bipe a chave da NF" onChange={handleNfChange} disabled={!volumes}/> {/*"disabled={!volumes}" desabilita o campo de input de NF se o volume não for inserido*/}
          </>
        ) : (
          <input type="text" placeholder="Bipe o volume" onChange={handleEtiquetaChange} />
        )}
        <p>{message}</p>

        {!bipandoVolumes && (
          <>
            <button onClick={handleNovaNota}>Incluir Nova Nota</button>
            <button onClick={handleExportPDF}>Finalizar e Exportar Relatório</button>
            {/*<button onClick={handleSave}>Salvar Conferência</button>*/}
          </>
        )}
      </div>
    </div>
  );
}
