import { useEffect, useRef, useState } from 'react';
const titles={glaeser:'1-g-Safrangläser · B2B',grosshandel:'Loser Safran · ab 10 kg',catering:'Catering'};
export function InquiryForm({topic,setTopic,selection}) {
  const [draft,setDraft]=useState(null),[copied,setCopied]=useState(false);
  const result=useRef();
  useEffect(()=>{setDraft(null);setCopied(false);},[topic,selection]);
  function prepare(e){
    e.preventDefault();const f=new FormData(e.currentTarget);
    const lines=['Guten Tag Royal Spices,','', 'ich interessiere mich für '+titles[topic]+'.','',
      'Name: '+f.get('name'),'Unternehmen: '+(f.get('company')||'–'),'E-Mail: '+f.get('email'),'Telefon: '+(f.get('phone')||'–'),
      'Lieferort / Veranstaltungsort: '+f.get('location')];
    if(topic==='glaeser')lines.push('Gewünschte Stückzahl: '+f.get('jars'));
    if(topic==='grosshandel')lines.push('Sorte: '+f.get('variety'),'Menge: '+f.get('kilos')+' kg');
    if(topic==='catering')lines.push('Gäste: '+f.get('guests'),'Termin: '+(f.get('date')||'Noch offen'),'Anlass: '+f.get('occasion'));
    if(f.get('documents'))lines.push('Bitte senden Sie verfügbare Labor- und Herkunftsunterlagen zur angebotenen Lieferung.');
    lines.push('','Meine Wünsche:',f.get('message')||'Bitte erstellen Sie ein individuelles Angebot.','','Freundliche Grüße',f.get('name'));
    setDraft({subject:'Anfrage Royal Spices – '+titles[topic],body:lines.join('\n')});setCopied(false);
    requestAnimationFrame(()=>result.current?.focus());
  }
  const mailto=draft?'mailto:info@royalspices.de?subject='+encodeURIComponent(draft.subject)+'&body='+encodeURIComponent(draft.body):'';
  async function copy(){try{await navigator.clipboard.writeText(draft.body);setCopied(true);}catch{setCopied(false);result.current?.focus();}}
  return <section id="anfrage" className="inquiry section-pad" aria-labelledby="inquiry-title">
    <div className="inquiry-heading"><p className="eyebrow">LASSEN SIE UNS SPRECHEN</p><h2 id="inquiry-title">Was dürfen wir<br/><em>für Sie planen?</em></h2><p>Safran für Ihr Geschäft. Catering für Ihren Anlass. Mit wenigen Angaben beginnt Ihr persönliches Angebot.</p><a href="tel:+494059374940">040 59374940</a><a href="mailto:info@royalspices.de">info@royalspices.de</a><p className="fineprint">Die Anfrage wird hier vorbereitet. Anschließend öffnen Sie den Entwurf in Ihrem E-Mail-Programm und senden ihn selbst ab.</p></div>
    <form onSubmit={prepare} onChange={()=>setDraft(null)}>
      <label>Ihr Interesse<select value={topic} onChange={e=>setTopic(e.target.value)} name="topic">{Object.entries(titles).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
      <div className="form-pair"><label>Name *<input name="name" autoComplete="name" required maxLength={100}/></label><label>Unternehmen<input name="company" autoComplete="organization" maxLength={160}/></label></div>
      <div className="form-pair"><label>E-Mail *<input name="email" type="email" autoComplete="email" required maxLength={180}/></label><label>Telefon<input name="phone" type="tel" autoComplete="tel" maxLength={40}/></label></div>
      <label>{topic==='catering'?'Veranstaltungsort':'Lieferort'} *<input name="location" autoComplete="address-level2" required maxLength={180}/></label>
      {topic==='glaeser'&&<label>Gewünschte Stückzahl *<input name="jars" type="number" min="1" step="1" max="100000" required/><span className="field-note">1 g pro Glas · 4,90 € inkl. MwSt. · 24er-Display: 117,60 € inkl. MwSt.</span></label>}
      {topic==='grosshandel'&&<div className="form-pair"><label>Sorte<select name="variety"><option>Negin</option><option>Pushal</option><option>Konjai</option><option>Beratung gewünscht</option></select></label><label>Menge in kg *<input name="kilos" type="number" min="10" step="0.1" max="100000" required/></label></div>}
      {topic==='catering'&&<><div className="form-pair"><label>Personenzahl *<input name="guests" type="number" min="1" step="1" max="100000" required/></label><label>Wunschtermin<input name="date" type="date" min={new Date().toLocaleDateString('en-CA')}/></label></div><label>Anlass *<input name="occasion" required maxLength={200} placeholder="z. B. Firmenempfang, Meeting, private Feier"/></label></>}
      <label>Ihre Wünsche<textarea key={topic+selection} name="message" rows={4} maxLength={1500} defaultValue={topic==='catering'?selection:''}/></label>
      {topic!=='catering'&&<label className="check-field"><input name="documents" type="checkbox"/>Labor- und Herkunftsunterlagen zur angebotenen Lieferung anfragen</label>}
      <p className="field-note">* Pflichtfeld. Ihre Eingaben werden auf dieser Seite nicht versendet. <a href="https://royalspices.de/datenschutz.html">Datenschutzhinweise</a></p>
      <button className="solid-button" type="submit">Anfrage vorbereiten <span aria-hidden="true">↗</span></button>
      {draft&&<div className="draft" ref={result} tabIndex={-1} aria-label="Ihr vorbereiteter E-Mail-Entwurf"><p className="eyebrow">IHR ENTWURF · NOCH NICHT GESENDET</p><pre>{draft.body}</pre><a className="solid-button" href={mailto}>Im E-Mail-Programm öffnen ↗</a><button type="button" className="text-link" onClick={copy}>Anfragetext kopieren</button><p role="status">{copied?'Anfragetext kopiert.':'Alternativ können Sie den Text markieren und kopieren.'}</p></div>}
    </form>
  </section>;
}

