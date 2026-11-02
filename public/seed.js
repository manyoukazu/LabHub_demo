// Illustrative records only. These are not real lab members or verified papers.
export const seed = [
 {id:'s1',kind:'spark',title:'LLMで、研究の「次の一歩」を見つける',body:'ゼミの雑談で出たアイデア。研究室に蓄積した論文と、何気ないひらめきをつなげたら、テーマを探している学生の助けになるかも。\n\nまずは過去の研究とアイデアの関係を見えるようにして、小さく試してみたい。',author:'教授（サンプル）',tags:['LLM','テーマ探し'],related:['l1','e1','s2'],source:''},
 {id:'l1',kind:'lab',title:'LLMを用いた研究アイデアの発想支援',body:'研究テーマを探す学生が、既存研究とのつながりを手がかりにアイデアを広げられる仕組みを検討する。\n\n先行研究を読むだけでなく、研究室にある知識を活かせる方法を探りたい。',author:'佐藤 / M2（サンプル）',tags:['LLM','発想支援'],related:['e1','e2'],source:''},
 {id:'e1',kind:'external',title:'Connected Papers',body:'論文どうしの関係をグラフで探索できる外部サービス。関連研究の見せ方の参考に。',author:'外部サービス',tags:['論文探索','発想支援'],related:['e2'],source:'https://www.connectedpapers.com/'},
 {id:'l2',kind:'lab',title:'計算資源の空き状況を可視化',body:'研究室のGPUが今使えるかを、一覧で把握できるようにする研究。実験の待ち時間を減らすことが目的。',author:'鈴木 / B4（サンプル）',tags:['インフラ','ラボ運営'],related:['s3'],source:''},
 {id:'s2',kind:'spark',title:'雑談のひらめきを、その場で残せない？',body:'帰り道やゼミ後に出てくる面白いアイデアは、そのまま流れてしまいがち。\n\nタイトルだけでも残して、後から誰かが育てられるストックがほしい。',author:'先輩（サンプル）',tags:['テーマ探し','発想支援'],related:['l1','s4'],source:''},
 {id:'e2',kind:'external',title:'Retrieval-Augmented Generation',body:'検索した情報をもとに回答を生成する手法。研究室の記録を参照する仕組みの検討材料としてストック。',author:'外部研究のメモ（サンプル）',tags:['LLM','自然言語処理'],related:['l3'],source:'https://arxiv.org/abs/2005.11401'},
 {id:'l3',kind:'lab',title:'ゼミ発表の理解を支援する要約',body:'発表の背景・目的・手法を整理し、専門知識が少ない学生でも質問を考えられるようにする。',author:'田中 / M1（サンプル）',tags:['自然言語処理','学習支援'],related:['s5'],source:''},
 {id:'s3',kind:'spark',title:'実験待ちの時間に、知識をシェア',body:'GPU待ちの時間を、研究室の誰かに相談できる時間にできないだろうか。何が得意か分かる地図があるとよさそう。',author:'先輩（サンプル）',tags:['ラボ運営','知識共有'],related:['s4'],source:''},
 {id:'e3',kind:'external',title:'研究ノートのナレッジグラフ',body:'ノート同士をリンクして、思いがけない接点を探す。個人のメモを研究室で使える形にするための参考。',author:'外部ツールのメモ（サンプル）',tags:['知識共有','論文探索'],related:['s2','e1'],source:''},
 {id:'s4',kind:'spark',title:'「誰に聞くとよいか」が見える研究室',body:'研究内容だけでなく、得意な手法や使ったことのあるツールもつながると、相談先を探しやすくなりそう。',author:'教授（サンプル）',tags:['知識共有','テーマ探し'],related:['l1'],source:''},
 {id:'s5',kind:'spark',title:'分からない専門用語から、問いを育てる',body:'発表中に引っかかった専門用語を残し、関連研究や詳しい人をたどれるようにしてみたい。',author:'先輩（サンプル）',tags:['学習支援','自然言語処理'],related:['e2'],source:''}
].map((v,i)=>({...v,created_at:new Date(Date.UTC(2026,9,20+i)).toISOString(),updated_at:new Date(Date.UTC(2026,9,20+i)).toISOString()}));
