"use client";

import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';
import jsPDF from 'jspdf';
import Image from 'next/image';

// Conexão com Supabase
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) 
  : null;

if (!supabase) {
  console.error('Erro ao conectar ao Supabase. Verifique as variáveis de ambiente.');
}

export default function Home() {
  const [nf, setNf] = useState('');
  const [volumes, setVolumes] = useState<number | null>(null);
  const [volumesRestantes, setVolumesRestantes] = useState(0);
  const [bipados, setBipados] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [conferencias, setConferencias] = useState<{ nf: string, volumes: number }[]>([]);
  const [bipandoVolumes, setBipandoVolumes] = useState(false);
  const [showRestart, setShowRestart] = useState(false);

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

  const handleNfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chave = e.target.value;
    if (chave.length === 44 && volumes) {
      const nfExtraido = chave.slice(25, 34);
      setNf(nfExtraido);
      setMessage(`NF: ${nfExtraido}. Agora bip os volumes.`);
      setBipandoVolumes(true);
    } else if (!volumes) {
      setMessage('Por favor, insira a quantidade de volumes antes de bipar a NF.');
    }
  };

  const handleEtiquetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const etq = e.target.value;
    if (etq.length === 19) {
        const nfEtiqueta = etq.slice(4, 13); // Extrai a NF da etiqueta
        const volume = etq.slice(-3); // Extrai o volume dos 3 últimos caracteres

        // Verifica se a NF da etiqueta corresponde à NF informada
        if (nfEtiqueta === nf) {
            // Verifica se o volume já foi bipado
            if (bipados.includes(volume)) {
                setMessage('Erro: Volume já bipado');
                new Audio('/erro.mp3').play();
            } else if (Number(volume) > (volumes as number)) {
                setMessage('Erro: Volume excede a quantidade informada.');
                new Audio('/erro.mp3').play();
                setShowRestart(true); // Exibe o botão de reiniciar em caso de erro
            } else {
                // Adiciona o volume ao array de volumes bipados
                setBipados((prev) => [...prev, volume]);
                setVolumesRestantes((prev) => prev - 1);
                if (volumesRestantes === 1) {
                    setMessage('Todos os volumes bipados. Deseja incluir nova nota ou finalizar?');
                    setBipandoVolumes(false);
                    handleSave();
                } else {
                    setMessage(`Volume ${volume} de ${volumes} bipado. Restam ${volumesRestantes - 1} volumes.`);
                }
            }
            e.target.value = ''; // Limpa o input após a bipagem
        } else {
            // Mensagem de erro se a NF não corresponder
            setMessage('Erro: NF divergente');
            new Audio('/erro.mp3').play();
            e.target.value = ''; // Limpa o input após a bipagem
        }
    }
};


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
      setConferencias((prev) => [...prev, { nf, volumes: volumes as number }]);
      setMessage('Conferência salva com sucesso!');
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const logo = '/logo.png';
    doc.addImage(logo, 'PNG', 10, 10, 50, 20);
    doc.text("Relatório de Conferência", 10, 40);
    conferencias.forEach((conf, index) => {
        doc.text(`Nota Fiscal: ${conf.nf} | Quantidade de volumes: ${conf.volumes}`, 10, 50 + (index * 10));
    });
    const finalLine = 50 + (conferencias.length * 10) + 20;
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 10, finalLine);
    doc.text('Nome: ________________', 10, finalLine + 10);
    doc.text('RG: __________________', 10, finalLine + 20);
    doc.text('Placa: _______________', 10, finalLine + 30);
    doc.text('Assinatura: ___________', 10, finalLine + 40);
    doc.save('relatorio_conferencia.pdf');

    // Limpa os estados para reiniciar a bipagem
    setNf('');
    setVolumes(null);
    setVolumesRestantes(0);
    setBipados([]);
    setConferencias([]); // Limpa as conferências salvas
    setMessage('Conferência finalizada. Insira a quantidade de volumes novamente.');
    setShowRestart(false); // Oculta o botão de reiniciar
};


  const handleNovaNota = () => {
    setNf('');
    setVolumes(0);
    setVolumesRestantes(0);
    setBipados([]);
    setMessage('Insira a quantidade de volumes');
  };

  const handleReiniciar = () => {
    // Atualiza a página
    window.location.reload();
  };

  return (
    <div className="main-container">
      <div className="content">
        <Image src="/logo.png" alt="Logo" width={200} height={200} />
        <h1>Conferência de Expedição</h1>
        {!bipandoVolumes ? (
          <>
            <input type="number" placeholder="Quantidade de volumes" onChange={handleVolumeChange} />
            <input type="text" placeholder="Bipe a chave da NF" onChange={handleNfChange} disabled={!volumes} />
          </>
        ) : (
          <input type="text" placeholder="Bipe o volume" onChange={handleEtiquetaChange} />
        )}
        <p>{message}</p>

        {!bipandoVolumes && (
          <>
            <button onClick={handleNovaNota}>Incluir Nova Nota</button>
            <button onClick={handleExportPDF}>Finalizar e Exportar Relatório</button>
          </>
        )}

        <div className="conferencias">
        {showRestart && <button onClick={handleReiniciar}>Reiniciar Conferência</button>}
        </div>
      </div>
    </div>
  );
}
