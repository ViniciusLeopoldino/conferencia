//TODO: incluir lógica para o usuario não precisar informar a quantidade de volumes pegar pela bipagem da etiqueta, considerar o campo volume total da etiqueta caracter (14, 15 e 16) 3567000009087002001

"use client";

import { createClient } from '@supabase/supabase-js';
import { useState, useRef, useEffect } from 'react';
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
  const [bipados, setBipados] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [conferencias, setConferencias] = useState<{ nf: string, volumes: number }[]>([]);
  const [bipandoVolumes, setBipandoVolumes] = useState(false);
  const [showRestart, setShowRestart] = useState(false);
  const [novaNfHabilitada, setNovaNfHabilitada] = useState(true); // Controle de habilitação de nova NF

  const nfInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (novaNfHabilitada) {
      nfInputRef.current?.focus();
    }
  }, [novaNfHabilitada]);

  const handleNfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!novaNfHabilitada) return; // Impede alterações quando a NF está desabilitada
    const chave = e.target.value;
    if (chave.length === 44) {
      const nfExtraido = chave.slice(25, 34);
      setNf(nfExtraido);
      setMessage(`NF: ${nfExtraido}. Agora, bip os volumes.`);
      setBipandoVolumes(true);
      e.target.value = '';
    }
  };

  const handleEtiquetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const etq = e.target.value;
    if (etq.length === 19) {
      const nfEtiqueta = etq.slice(4, 13); // NF da etiqueta
      const volume = etq.slice(-3); // Últimos 3 caracteres
      const volumeNF = parseInt(etq.slice(13, 16), 10); // Total de volumes

      // Define a quantidade total de volumes na primeira etiqueta
      if (volumes === null) {
        setVolumes(volumeNF);
      }

      // Valida se a NF da etiqueta corresponde à NF informada
      if (nfEtiqueta === nf) {
        if (bipados.includes(volume)) {
          setMessage('Erro: Volume já bipado! \nBipe outro volume.');
          new Audio('/erro.mp3').play();
          setShowRestart(true);
        } else if (bipados.length >= volumeNF) {
          setMessage('Erro: Todos os volumes já foram bipados.');
          new Audio('/erro.mp3').play();
          setShowRestart(true);
        } else {
          // Adiciona o volume ao array de volumes bipados
          const novosVolumesBipados = [...bipados, volume];
          setBipados(novosVolumesBipados);

          // Verifica a quantidade total de volumes bipados
          const quantidadeBipados = novosVolumesBipados.length;

          // Atualiza a mensagem e a lógica quando todos os volumes são bipados
          if (quantidadeBipados === volumeNF) {
            setMessage('Todos os volumes bipados. Deseja incluir nova nota ou finalizar?');
            setBipandoVolumes(false);
            setNovaNfHabilitada(false); // Desativa o campo de nova NF
            handleSave();
          } else {
            setMessage(`Volume ${volume} de ${volumeNF} bipado. Restam ${volumeNF - quantidadeBipados} volumes.`);
          }
          e.target.value = '';
        }
      } else {
        setMessage('Erro: NF divergente');
        new Audio('/erro.mp3').play();
        setShowRestart(true);
        e.target.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!supabase) {
        setMessage('Erro: Supabase não está configurado.');
        return;
    }

    const volumeSalvo = bipados.length + 1;

    const novaConferencia = { nf, volumes: volumeSalvo, created_at: new Date().toISOString() };

    const { error } = await supabase
        .from('conferencias')
        .insert([novaConferencia]);

    if (error) {
        setMessage(`Erro ao salvar a conferência: ${error.message}`);
        setShowRestart(true);
    } else {
        setConferencias((prev) => [...prev, { nf, volumes: volumeSalvo }]);
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

    setNf('');
    setVolumes(null);
    setBipados([]);
    setConferencias([]);
    setMessage('Conferência finalizada.');
    setShowRestart(false);
    setNovaNfHabilitada(true); // Habilita o campo de nova NF ao finalizar
  };

  const handleNovaNota = () => {
    setNf('');
    setVolumes(null);
    setBipados([]);
    setMessage('Insira a chave da NF');
    setNovaNfHabilitada(true); // Habilita o campo de nova NF
    nfInputRef.current?.focus();
  };

  const handleReiniciar = () => {
    window.location.reload();
  };

  return (
    <div className="main-container">
      <div className="content">
        <Image src="/logo.png" alt="Logo" width={200} height={200} />
        <h1>Conferência de Expedição</h1>
        {!bipandoVolumes ? (
          <input
            type="text"
            ref={nfInputRef}
            placeholder="Bipe a chave da NF"
            onChange={handleNfChange}
            disabled={!novaNfHabilitada} // Desativa quando nova NF está desabilitada
          />
        ) : (
          <input type="text" placeholder="Bipe o volume" onChange={handleEtiquetaChange} />
        )}
         <p className={message.includes("Erro") ? "error-message" : ""}>{message}</p>  {/*aqui inclui cor no erro */}

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
