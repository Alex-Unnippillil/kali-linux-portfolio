(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[2307,3103],{32307:(_,e,t)=>{"use strict";t.r(e),t.d(e,{default:()=>g});var l=t(37876),a=t(14232),o=t(86447),i=t(99068),r=t(83103),s=t(97477),n=t(89099);let c=["Standard","Slant","Big"],T=[10,12,14],u="@%#*+=-:. ",I=["\xaf\\_(ツ)_/\xaf","(╯\xb0□\xb0）╯︵ ┻━┻","┌─┐\n│ │\n└─┘"],L=()=>(0,l.jsx)("svg",{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",className:"w-6 h-6",children:(0,l.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2"})}),E=_=>{let{title:e,children:t,className:a}=_;return(0,l.jsxs)("section",{className:"rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-3 font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ".concat(null!=a?a:""),children:[(0,l.jsx)("h2",{className:"mb-2 text-xs font-semibold uppercase tracking-wide text-kali-text opacity-70",children:e}),(0,l.jsx)("div",{className:"flex flex-col gap-2",children:t})]})},d=_=>{let{children:e,className:t}=_;return(0,l.jsx)("div",{className:"flex flex-wrap items-center gap-2 ".concat(null!=t?t:""),children:e})},A=_=>{let{fgColor:e,bgColor:t,onFgChange:a,onBgChange:o}=_;return(0,l.jsxs)(d,{children:[(0,l.jsxs)("label",{className:"flex items-center gap-1 text-kali-text",children:["FG",(0,l.jsx)("input",{type:"color",value:e,onChange:_=>a(_.target.value),"aria-label":"Foreground color",className:"w-10 h-6 p-0 border-0 bg-transparent"})]}),(0,l.jsxs)("label",{className:"flex items-center gap-1 text-kali-text",children:["BG",(0,l.jsx)("input",{type:"color",value:t,onChange:_=>o(_.target.value),"aria-label":"Background color",className:"w-10 h-6 p-0 border-0 bg-transparent"})]})]})},x=_=>{let{value:e,onChange:t}=_;return(0,l.jsxs)("label",{className:"flex flex-col gap-1 text-sm text-kali-text",children:[(0,l.jsx)("span",{className:"text-xs uppercase tracking-wide text-kali-text opacity-60",children:"Font size"}),(0,l.jsx)("select",{"aria-label":"Font size",value:e,onChange:_=>t(Number(_.target.value)),className:"rounded border border-[color:var(--kali-border)] bg-[color:var(--color-text)] px-2 py-1 font-mono text-[color:var(--color-inverse)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus",children:T.map(_=>(0,l.jsx)("option",{value:_,children:_},_))})]})};function f(_,e){let t=new Blob([_],{type:"text/plain"}),l=URL.createObjectURL(t),a=document.createElement("a");a.href=l,a.download=e,a.click(),URL.revokeObjectURL(l)}function b(_){let e=parseInt(_.replace("#",""),16);return[e>>16&255,e>>8&255,255&e]}function p(_,e,t){let[l,a,o]=b(e),[i,r,s]=b(t),n="".concat("\x1b","[38;2;").concat(l,";").concat(a,";").concat(o,"m"),c="".concat("\x1b","[48;2;").concat(i,";").concat(r,";").concat(s,"m");return"".concat(n).concat(c).concat(_).concat("\x1b","[0m")}let g=()=>{let _=(0,n.useRouter)(),[e,t]=(0,a.useState)("text"),[T,b]=(0,a.useState)(""),g=(0,a.useRef)(null),[N,m]=(0,a.useState)("Standard"),[R,v]=(0,a.useState)(""),[h,C]=(0,a.useState)("#00ff00"),[S,k]=(0,a.useState)("#000000"),[y,H]=(0,a.useState)(12),j=(0,a.useRef)(null),M=(0,a.useRef)(null),[$,U]=(0,a.useState)(""),[W,O]=(0,a.useState)(0),[P,w]=(0,a.useState)(1);(0,a.useEffect)(()=>{o.default.parseFont("Standard",i.default),o.default.parseFont("Slant",r.default),o.default.parseFont("Big",s.default)},[]),(0,a.useEffect)(()=>{if(!_.isReady)return;let{t:e,f:t,b:l,c:a}=_.query;if("string"==typeof e&&b(e),"string"==typeof t&&c.includes(t)&&m(t),"string"==typeof l){let _=parseFloat(l);!Number.isNaN(_)&&_>=-1&&_<=1&&O(_)}if("string"==typeof a){let _=parseFloat(a);!Number.isNaN(_)&&_>=0&&_<=2&&w(_)}},[_.isReady]),(0,a.useEffect)(()=>{let e=new URLSearchParams;T&&e.set("t",T),N&&"Standard"!==N&&e.set("f",N),0!==W&&e.set("b",String(W)),1!==P&&e.set("c",String(P));let t=e.toString(),l=t?"".concat(_.pathname,"?").concat(t):_.pathname;_.replace(l,void 0,{shallow:!0})},[_,T,N,W,P]),(0,a.useEffect)(()=>{let _=g.current;_&&(_.style.height="auto",_.style.height="".concat(_.scrollHeight,"px"))},[T]),(0,a.useEffect)(()=>{try{v(o.default.textSync(T||"",{font:N}))}catch(_){v("")}},[T,N]);let G=async _=>{try{let e=_?p(_,h,S):"";await navigator.clipboard.writeText(e)}catch(_){}},D=(0,a.useCallback)(()=>{let _=j.current;if(!_)return;let e=_.getContext("2d");if(!e)return;let{width:t,height:l}=_,a=e.getImageData(0,0,t,l).data,o="";for(let _=0;_<l;_+=1){for(let e=0;e<t;e+=1){let l=(_*t+e)*4,i=(a[l]+a[l+1]+a[l+2])/3/255;i+=W;let r=Math.floor((1-(i=Math.min(1,Math.max(0,i=(i-.5)*P+.5))))*(u.length-1));o+=u[r]}o+="\n"}U(o)},[W,P]);(0,a.useEffect)(()=>{D()},[D]);let F=(0,a.useCallback)(_=>{let e=M.current;if(!e)return;let t=e.getContext("2d");if(!t)return;let l=_.split("\n"),a=.6*y,o=Math.max(...l.map(_=>_.length))*a,i=l.length*y;e.width=o,e.height=i,t.fillStyle=S,t.fillRect(0,0,o,i),t.fillStyle=h,t.font="".concat(y,"px monospace"),t.textBaseline="top",l.forEach((_,e)=>{t.fillText(_,0,e*y)})},[h,S,y]);(0,a.useEffect)(()=>{F("text"===e?R:$)},[e,R,$,F]);let V=_=>{let e=M.current;if(!e)return;let t=document.createElement("a");t.href=e.toDataURL("image/png"),t.download=_,t.click()},B="min-h-[12rem] whitespace-pre overflow-auto rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-[6px] font-mono leading-tight text-[color:var(--color-text)] shadow-inner shadow-[color:color-mix(in_srgb,var(--kali-panel-border)_65%,rgba(8,15,23,0.6))]";return(0,l.jsxs)("div",{className:"flex h-full flex-col gap-4 overflow-auto bg-kali-background p-4 font-mono text-kali-text",children:[(0,l.jsxs)("div",{className:"flex gap-2",children:[(0,l.jsx)("button",{type:"button","aria-pressed":"text"===e,className:"rounded border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ".concat("text"===e?"border-[color:var(--color-primary)] bg-kali-primary text-kali-inverse shadow-[0_0_0_1px_rgba(15,148,210,0.35)]":"border-[color:var(--kali-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] hover:bg-[var(--kali-panel-highlight)]"),onClick:()=>t("text"),children:"Text"}),(0,l.jsx)("button",{type:"button","aria-pressed":"image"===e,className:"rounded border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ".concat("image"===e?"border-[color:var(--color-primary)] bg-kali-primary text-kali-inverse shadow-[0_0_0_1px_rgba(15,148,210,0.35)]":"border-[color:var(--kali-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] hover:bg-[var(--kali-panel-highlight)]"),onClick:()=>t("image"),children:"Image"})]}),"text"===e&&(0,l.jsxs)("div",{className:"flex flex-col gap-3",children:[(0,l.jsxs)(E,{title:"Text styling",children:[(0,l.jsx)("textarea",{ref:g,rows:1,"aria-label":"ASCII input editor",className:"resize-none overflow-hidden rounded border border-[color:var(--kali-border)] bg-[color:var(--color-text)] px-2 py-1 font-mono leading-none text-[color:var(--color-inverse)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus",style:{fontFamily:"monospace",lineHeight:"1",fontSize:"".concat(y,"px")},placeholder:"Enter text",value:T,onChange:_=>b(_.target.value)}),(0,l.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-2",children:[(0,l.jsxs)("label",{className:"flex flex-col gap-1 text-sm text-kali-text",children:[(0,l.jsx)("span",{className:"text-xs uppercase tracking-wide text-kali-text opacity-60",children:"Font"}),(0,l.jsx)("select",{"aria-label":"Font selection",value:N,onChange:_=>m(_.target.value),className:"rounded border border-[color:var(--kali-border)] bg-[color:var(--color-text)] px-2 py-1 font-mono text-[color:var(--color-inverse)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus",children:c.map(_=>(0,l.jsx)("option",{value:_,children:_},_))})]}),(0,l.jsx)(x,{value:y,onChange:H})]})]}),(0,l.jsx)(E,{title:"Color",children:(0,l.jsx)(A,{fgColor:h,bgColor:S,onFgChange:C,onBgChange:k})}),(0,l.jsxs)("div",{className:"flex flex-wrap gap-2",children:[(0,l.jsxs)("button",{type:"button",className:"flex items-center gap-1 rounded border border-[color:var(--color-primary)] bg-kali-primary px-2 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus",onClick:()=>G(R),children:[(0,l.jsx)(L,{}),(0,l.jsx)("span",{children:"Copy ASCII"})]}),(0,l.jsx)("button",{type:"button",className:"rounded border border-[color:var(--color-terminal)] bg-kali-terminal px-2 py-1 text-sm font-medium text-[color:var(--kali-terminal-text)] transition-colors hover:bg-kali-terminal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus",onClick:()=>f(p(R,h,S),"ascii-art.txt"),children:"Download Text"}),(0,l.jsx)("button",{type:"button",className:"rounded border border-[color:var(--color-accent)] bg-kali-accent px-2 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus",onClick:()=>V("ascii-art.png"),children:"Save Image"})]}),(0,l.jsx)("pre",{className:B,style:{imageRendering:"pixelated",fontSize:"".concat(y,"px"),color:h,backgroundColor:S},children:R}),(0,l.jsx)("canvas",{ref:M,"aria-hidden":"true",className:"mt-2",style:{imageRendering:"pixelated"}}),(0,l.jsx)("div",{className:"mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2",children:I.map((_,e)=>(0,l.jsx)("pre",{onMouseEnter:()=>G(_),className:"cursor-pointer whitespace-pre rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-2 font-mono leading-none text-[color:var(--color-text)] transition-colors hover:bg-[var(--kali-panel-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus",style:{imageRendering:"pixelated"},children:_},e))})]}),"image"===e&&(0,l.jsxs)("div",{className:"flex flex-col gap-3",children:[(0,l.jsxs)(E,{title:"Image",children:[(0,l.jsx)("input",{type:"file",accept:"image/*","aria-label":"Upload image for ASCII conversion",onChange:_=>{var e;let t=null==(e=_.target.files)?void 0:e[0];if(!t)return;let l=new Image;l.onload=()=>{let _=j.current;if(!_)return;let e=80/l.width,t=Math.floor(l.height*e*.5);_.width=80,_.height=t;let a=_.getContext("2d");a&&(a.drawImage(l,0,0,80,t),D())},l.src=URL.createObjectURL(t)}}),(0,l.jsxs)(d,{className:"gap-4",children:[(0,l.jsxs)("label",{className:"flex items-center gap-2 text-sm text-kali-text",children:[(0,l.jsx)("span",{className:"text-xs uppercase tracking-wide text-kali-text opacity-60",children:"Brightness"}),(0,l.jsx)("input",{type:"range",min:"-1",max:"1",step:"0.1",value:W,"aria-label":"Adjust brightness",onChange:_=>O(Number(_.target.value))})]}),(0,l.jsxs)("label",{className:"flex items-center gap-2 text-sm text-kali-text",children:[(0,l.jsx)("span",{className:"text-xs uppercase tracking-wide text-kali-text opacity-60",children:"Contrast"}),(0,l.jsx)("input",{type:"range",min:"0",max:"2",step:"0.1",value:P,"aria-label":"Adjust contrast",onChange:_=>w(Number(_.target.value))})]})]})]}),(0,l.jsx)(E,{title:"Color",children:(0,l.jsx)(A,{fgColor:h,bgColor:S,onFgChange:C,onBgChange:k})}),(0,l.jsx)(E,{title:"Text styling",children:(0,l.jsx)(x,{value:y,onChange:H})}),(0,l.jsxs)("div",{className:"flex flex-wrap gap-2",children:[(0,l.jsxs)("button",{type:"button",className:"flex items-center gap-1 rounded border border-[color:var(--color-primary)] bg-kali-primary px-2 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus",onClick:()=>G($),children:[(0,l.jsx)(L,{}),(0,l.jsx)("span",{children:"Copy ASCII"})]}),(0,l.jsx)("button",{type:"button",className:"rounded border border-[color:var(--color-terminal)] bg-kali-terminal px-2 py-1 text-sm font-medium text-[color:var(--kali-terminal-text)] transition-colors hover:bg-kali-terminal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus",onClick:()=>f(p($,h,S),"image-ascii.txt"),children:"Download Text"}),(0,l.jsx)("button",{type:"button",className:"rounded border border-[color:var(--color-accent)] bg-kali-accent px-2 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus",onClick:()=>V("image-ascii.png"),children:"Save Image"})]}),(0,l.jsx)("canvas",{ref:j,"aria-hidden":"true",className:"hidden"}),(0,l.jsx)("pre",{className:B,style:{imageRendering:"pixelated",fontSize:"".concat(y,"px"),color:h,backgroundColor:S},children:$}),(0,l.jsx)("canvas",{ref:M,"aria-hidden":"true",className:"mt-2",style:{imageRendering:"pixelated"}})]})]})}},83103:(_,e,t)=>{"use strict";t.r(e),t.d(e,{default:()=>l});let l=`flf2a$ 6 5 16 15 10 0 18319
Slant by Glenn Chappell 3/93 -- based on Standard
Includes ISO Latin-1
figlet release 2.1 -- 12 Aug 1994
Permission is hereby given to modify this font, as long as the
modifier's name is placed on a comment line.

Modified by Paul Burton <solution@earthlink.net> 12/96 to include new parameter
supported by FIGlet and FIGWin.  May also be slightly modified for better use
of new full-width/kern/smush alternatives, but default output is NOT changed.

     $$@
    $$ @
   $$  @
  $$   @
 $$    @
$$     @@
    __@
   / /@
  / / @
 /_/  @
(_)   @
      @@
 _ _ @
( | )@
|/|/ @
 $   @
$    @
     @@
     __ __ @
  __/ // /_@
 /_  _  __/@
/_  _  __/ @
 /_//_/    @
           @@
     __@
   _/ /@
  / __/@
 (_  ) @
/  _/  @
/_/    @@
   _   __@
  (_)_/_/@
   _/_/  @
 _/_/_   @
/_/ (_)  @
         @@
   ___   @
  ( _ )  @
 / __ \\/|@
/ /_/  < @
\\____/\\/ @
         @@
  _ @
 ( )@
 |/ @
 $  @
$   @
    @@
     __@
   _/_/@
  / /  @
 / /   @
/ /    @
|_|    @@
     _ @
    | |@
    / /@
   / / @
 _/_/  @
/_/    @@
       @
  __/|_@
 |    /@
/_ __| @
 |/    @
       @@
       @
    __ @
 __/ /_@
/_  __/@
 /_/   @
       @@
   @
   @
   @
 _ @
( )@
|/ @@
       @
       @
 ______@
/_____/@
  $    @
       @@
   @
   @
   @
 _ @
(_)@
   @@
       __@
     _/_/@
   _/_/  @
 _/_/    @
/_/      @
         @@
   ____ @
  / __ \\@
 / / / /@
/ /_/ / @
\\____/  @
        @@
   ___@
  <  /@
  / / @
 / /  @
/_/   @
      @@
   ___ @
  |__ \\@
  __/ /@
 / __/ @
/____/ @
       @@
   _____@
  |__  /@
   /_ < @
 ___/ / @
/____/  @
        @@
   __ __@
  / // /@
 / // /_@
/__  __/@
  /_/   @
        @@
    ______@
   / ____/@
  /___ \\  @
 ____/ /  @
/_____/   @
          @@
   _____@
  / ___/@
 / __ \\ @
/ /_/ / @
\\____/  @
        @@
 _____@
/__  /@
  / / @
 / /  @
/_/   @
      @@
   ____ @
  ( __ )@
 / __  |@
/ /_/ / @
\\____/  @
        @@
   ____ @
  / __ \\@
 / /_/ /@
 \\__, / @
/____/  @
        @@
     @
   _ @
  (_)@
 _   @
(_)  @
     @@
     @
   _ @
  (_)@
 _   @
( )  @
|/   @@
  __@
 / /@
/ / @
\\ \\ @
 \\_\\@
    @@
       @
  _____@
 /____/@
/____/ @
  $    @
       @@
__  @
\\ \\ @
 \\ \\@
 / /@
/_/ @
    @@
  ___ @
 /__ \\@
  / _/@
 /_/  @
(_)   @
      @@
   ______ @
  / ____ \\@
 / / __ \`/@
/ / /_/ / @
\\ \\__,_/  @
 \\____/   @@
    ___ @
   /   |@
  / /| |@
 / ___ |@
/_/  |_|@
        @@
    ____ @
   / __ )@
  / __  |@
 / /_/ / @
/_____/  @
         @@
   ______@
  / ____/@
 / /     @
/ /___   @
\\____/   @
         @@
    ____ @
   / __ \\@
  / / / /@
 / /_/ / @
/_____/  @
         @@
    ______@
   / ____/@
  / __/   @
 / /___   @
/_____/   @
          @@
    ______@
   / ____/@
  / /_    @
 / __/    @
/_/       @
          @@
   ______@
  / ____/@
 / / __  @
/ /_/ /  @
\\____/   @
         @@
    __  __@
   / / / /@
  / /_/ / @
 / __  /  @
/_/ /_/   @
          @@
    ____@
   /  _/@
   / /  @
 _/ /   @
/___/   @
        @@
       __@
      / /@
 __  / / @
/ /_/ /  @
\\____/   @
         @@
    __ __@
   / //_/@
  / ,<   @
 / /| |  @
/_/ |_|  @
         @@
    __ @
   / / @
  / /  @
 / /___@
/_____/@
       @@
    __  ___@
   /  |/  /@
  / /|_/ / @
 / /  / /  @
/_/  /_/   @
           @@
    _   __@
   / | / /@
  /  |/ / @
 / /|  /  @
/_/ |_/   @
          @@
   ____ @
  / __ \\@
 / / / /@
/ /_/ / @
\\____/  @
        @@
    ____ @
   / __ \\@
  / /_/ /@
 / ____/ @
/_/      @
         @@
   ____ @
  / __ \\@
 / / / /@
/ /_/ / @
\\___\\_\\ @
        @@
    ____ @
   / __ \\@
  / /_/ /@
 / _, _/ @
/_/ |_|  @
         @@
   _____@
  / ___/@
  \\__ \\ @
 ___/ / @
/____/  @
        @@
  ______@
 /_  __/@
  / /   @
 / /    @
/_/     @
        @@
   __  __@
  / / / /@
 / / / / @
/ /_/ /  @
\\____/   @
         @@
 _    __@
| |  / /@
| | / / @
| |/ /  @
|___/   @
        @@
 _       __@
| |     / /@
| | /| / / @
| |/ |/ /  @
|__/|__/   @
           @@
   _  __@
  | |/ /@
  |   / @
 /   |  @
/_/|_|  @
        @@
__  __@
\\ \\/ /@
 \\  / @
 / /  @
/_/   @
      @@
 _____@
/__  /@
  / / @
 / /__@
/____/@
      @@
     ___@
    / _/@
   / /  @
  / /   @
 / /    @
/__/    @@
__    @
\\ \\   @
 \\ \\  @
  \\ \\ @
   \\_\\@
      @@
     ___@
    /  /@
    / / @
   / /  @
 _/ /   @
/__/    @@
  //|@
 |/||@
  $  @
 $   @
$    @
     @@
       @
       @
       @
       @
 ______@
/_____/@@
  _ @
 ( )@
  V @
 $  @
$   @
    @@
        @
  ____ _@
 / __ \`/@
/ /_/ / @
\\__,_/  @
        @@
    __  @
   / /_ @
  / __ \\@
 / /_/ /@
/_.___/ @
        @@
       @
  _____@
 / ___/@
/ /__  @
\\___/  @
       @@
       __@
  ____/ /@
 / __  / @
/ /_/ /  @
\\__,_/   @
         @@
      @
  ___ @
 / _ \\@
/  __/@
\\___/ @
      @@
    ____@
   / __/@
  / /_  @
 / __/  @
/_/     @
        @@
         @
   ____ _@
  / __ \`/@
 / /_/ / @
 \\__, /  @
/____/   @@
    __  @
   / /_ @
  / __ \\@
 / / / /@
/_/ /_/ @
        @@
    _ @
   (_)@
  / / @
 / /  @
/_/   @
      @@
       _ @
      (_)@
     / / @
    / /  @
 __/ /   @
/___/    @@
    __  @
   / /__@
  / //_/@
 / ,<   @
/_/|_|  @
        @@
    __@
   / /@
  / / @
 / /  @
/_/   @
      @@
            @
   ____ ___ @
  / __ \`__ \\@
 / / / / / /@
/_/ /_/ /_/ @
            @@
        @
   ____ @
  / __ \\@
 / / / /@
/_/ /_/ @
        @@
       @
  ____ @
 / __ \\@
/ /_/ /@
\\____/ @
       @@
         @
    ____ @
   / __ \\@
  / /_/ /@
 / .___/ @
/_/      @@
        @
  ____ _@
 / __ \`/@
/ /_/ / @
\\__, /  @
  /_/   @@
        @
   _____@
  / ___/@
 / /    @
/_/     @
        @@
        @
   _____@
  / ___/@
 (__  ) @
/____/  @
        @@
   __ @
  / /_@
 / __/@
/ /_  @
\\__/  @
      @@
        @
  __  __@
 / / / /@
/ /_/ / @
\\__,_/  @
        @@
       @
 _   __@
| | / /@
| |/ / @
|___/  @
       @@
          @
 _      __@
| | /| / /@
| |/ |/ / @
|__/|__/  @
          @@
        @
   _  __@
  | |/_/@
 _>  <  @
/_/|_|  @
        @@
         @
   __  __@
  / / / /@
 / /_/ / @
 \\__, /  @
/____/   @@
     @
 ____@
/_  /@
 / /_@
/___/@
     @@
     __@
   _/_/@
 _/_/  @
< <    @
/ /    @
\\_\\    @@
     __@
    / /@
   / / @
  / /  @
 / /   @
/_/    @@
     _ @
    | |@
    / /@
   _>_>@
 _/_/  @
/_/    @@
  /\\//@
 //\\/ @
  $   @
 $    @
$     @
      @@
    _  _ @
   (_)(_)@
  / _ |  @
 / __ |  @
/_/ |_|  @
         @@
   _   _ @
  (_)_(_)@
 / __ \\  @
/ /_/ /  @
\\____/   @
         @@
   _   _ @
  (_) (_)@
 / / / / @
/ /_/ /  @
\\____/   @
         @@
   _   _ @
  (_)_(_)@
 / __ \`/ @
/ /_/ /  @
\\__,_/   @
         @@
   _   _ @
  (_)_(_)@
 / __ \\  @
/ /_/ /  @
\\____/   @
         @@
   _   _ @
  (_) (_)@
 / / / / @
/ /_/ /  @
\\__,_/   @
         @@
     ____ @
    / __ \\@
   / / / /@
  / /_| | @
 / //__/  @
/_/       @@
160  NO-BREAK SPACE
     $$@
    $$ @
   $$  @
  $$   @
 $$    @
$$     @@
161  INVERTED EXCLAMATION MARK
    _ @
   (_)@
  / / @
 / /  @
/_/   @
      @@
162  CENT SIGN
     __@
  __/ /@
 / ___/@
/ /__  @
\\  _/  @
/_/    @@
163  POUND SIGN
     ____ @
    / ,__\\@
 __/ /_   @
 _/ /___  @
(_,____/  @
          @@
164  CURRENCY SIGN
    /|___/|@
   | __  / @
  / /_/ /  @
 /___  |   @
|/   |/    @
           @@
165  YEN SIGN
    ____@
  _| / /@
 /_  __/@
/_  __/ @
 /_/    @
        @@
166  BROKEN BAR
     __@
    / /@
   /_/ @
  __   @
 / /   @
/_/    @@
167  SECTION SIGN
     __ @
   _/ _)@
  / | | @
 | || | @
 | |_/  @
(__/    @@
168  DIAERESIS
  _   _ @
 (_) (_)@
  $   $ @
 $   $  @
$   $   @
        @@
169  COPYRIGHT SIGN
    ______  @
   / _____\\ @
  / / ___/ |@
 / / /__  / @
|  \\___/ /  @
 \\______/   @@
170  FEMININE ORDINAL INDICATOR
   ___ _@
  / _ \`/@
 _\\_,_/ @
/____/  @
 $      @
        @@
171  LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
  ____@
 / / /@
/ / / @
\\ \\ \\ @
 \\_\\_\\@
      @@
172  NOT SIGN
       @
 ______@
/___  /@
   /_/ @
 $     @
       @@
173  SOFT HYPHEN
      @
      @
 _____@
/____/@
  $   @
      @@
174  REGISTERED SIGN
    ______  @
   / ___  \\ @
  / / _ \\  |@
 / / , _/ / @
| /_/|_| /  @
 \\______/   @@
175  MACRON
 ______@
/_____/@
  $    @
 $     @
$      @
       @@
176  DEGREE SIGN
  ___ @
 / _ \\@
/ // /@
\\___/ @
 $    @
      @@
177  PLUS-MINUS SIGN
      __ @
   __/ /_@
  /_  __/@
 __/_/_  @
/_____/  @
         @@
178  SUPERSCRIPT TWO
   ___ @
  |_  |@
 / __/ @
/____/ @
 $     @
       @@
179  SUPERSCRIPT THREE
   ____@
  |_  /@
 _/_ < @
/____/ @
 $     @
       @@
180  ACUTE ACCENT
  __@
 /_/@
  $ @
 $  @
$   @
    @@
181  MICRO SIGN
          @
    __  __@
   / / / /@
  / /_/ / @
 / ._,_/  @
/_/       @@
182  PILCROW SIGN
  _______@
 / _    /@
/ (/ / / @
\\_  / /  @
 /_/_/   @
         @@
183  MIDDLE DOT
   @
 _ @
(_)@
 $ @
$  @
   @@
184  CEDILLA
   @
   @
   @
   @
 _ @
/_)@@
185  SUPERSCRIPT ONE
  ___@
 <  /@
 / / @
/_/  @
$    @
     @@
186  MASCULINE ORDINAL INDICATOR
   ___ @
  / _ \\@
 _\\___/@
/____/ @
 $     @
       @@
187  RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
____  @
\\ \\ \\ @
 \\ \\ \\@
 / / /@
/_/_/ @
      @@
188  VULGAR FRACTION ONE QUARTER
  ___   __ @
 <  / _/_/ @
 / /_/_/___@
/_//_// / /@
 /_/ /_  _/@
      /_/  @@
189  VULGAR FRACTION ONE HALF
  ___   __   @
 <  / _/_/__ @
 / /_/_/|_  |@
/_//_/ / __/ @
 /_/  /____/ @
             @@
190  VULGAR FRACTION THREE QUARTERS
   ____    __ @
  |_  /  _/_/ @
 _/_ < _/_/___@
/____//_// / /@
    /_/ /_  _/@
         /_/  @@
191  INVERTED QUESTION MARK
    _ @
   (_)@
 _/ / @
/ _/_ @
\\___/ @
      @@
192  LATIN CAPITAL LETTER A WITH GRAVE
    __ @
   _\\_\\@
  / _ |@
 / __ |@
/_/ |_|@
       @@
193  LATIN CAPITAL LETTER A WITH ACUTE
     __@
   _/_/@
  / _ |@
 / __ |@
/_/ |_|@
       @@
194  LATIN CAPITAL LETTER A WITH CIRCUMFLEX
     //|@
   _|/||@
  / _ | @
 / __ | @
/_/ |_| @
        @@
195  LATIN CAPITAL LETTER A WITH TILDE
     /\\//@
   _//\\/ @
  / _ |  @
 / __ |  @
/_/ |_|  @
         @@
196  LATIN CAPITAL LETTER A WITH DIAERESIS
    _  _ @
   (_)(_)@
  / _ |  @
 / __ |  @
/_/ |_|  @
         @@
197  LATIN CAPITAL LETTER A WITH RING ABOVE
    (())@
   /   |@
  / /| |@
 / ___ |@
/_/  |_|@
        @@
198  LATIN CAPITAL LETTER AE
    __________@
   /     ____/@
  / /|  __/   @
 / __  /___   @
/_/ /_____/   @
              @@
199  LATIN CAPITAL LETTER C WITH CEDILLA
   ______@
  / ____/@
 / /     @
/ /___   @
\\____/   @
 /_)     @@
200  LATIN CAPITAL LETTER E WITH GRAVE
    __ @
   _\\_\\@
  / __/@
 / _/  @
/___/  @
       @@
201  LATIN CAPITAL LETTER E WITH ACUTE
     __@
   _/_/@
  / __/@
 / _/  @
/___/  @
       @@
202  LATIN CAPITAL LETTER E WITH CIRCUMFLEX
     //|@
   _|/||@
  / __/ @
 / _/   @
/___/   @
        @@
203  LATIN CAPITAL LETTER E WITH DIAERESIS
    _  _ @
   (_)(_)@
  / __/  @
 / _/    @
/___/    @
         @@
204  LATIN CAPITAL LETTER I WITH GRAVE
    __ @
   _\\_\\@
  /  _/@
 _/ /  @
/___/  @
       @@
205  LATIN CAPITAL LETTER I WITH ACUTE
     __@
   _/_/@
  /  _/@
 _/ /  @
/___/  @
       @@
206  LATIN CAPITAL LETTER I WITH CIRCUMFLEX
     //|@
   _|/||@
  /  _/ @
 _/ /   @
/___/   @
        @@
207  LATIN CAPITAL LETTER I WITH DIAERESIS
    _  _ @
   (_)(_)@
  /  _/  @
 _/ /    @
/___/    @
         @@
208  LATIN CAPITAL LETTER ETH
     ____ @
    / __ \\@
 __/ /_/ /@
/_  __/ / @
 /_____/  @
          @@
209  LATIN CAPITAL LETTER N WITH TILDE
     /\\//@
   _//\\/ @
  / |/ / @
 /    /  @
/_/|_/   @
         @@
210  LATIN CAPITAL LETTER O WITH GRAVE
    __ @
  __\\_\\@
 / __ \\@
/ /_/ /@
\\____/ @
       @@
211  LATIN CAPITAL LETTER O WITH ACUTE
     __@
  __/_/@
 / __ \\@
/ /_/ /@
\\____/ @
       @@
212  LATIN CAPITAL LETTER O WITH CIRCUMFLEX
    //|@
  _|/||@
 / __ \\@
/ /_/ /@
\\____/ @
       @@
213  LATIN CAPITAL LETTER O WITH TILDE
    /\\//@
  _//\\/ @
 / __ \\ @
/ /_/ / @
\\____/  @
        @@
214  LATIN CAPITAL LETTER O WITH DIAERESIS
   _   _ @
  (_)_(_)@
 / __ \\  @
/ /_/ /  @
\\____/   @
         @@
215  MULTIPLICATION SIGN
     @
     @
 /|/|@
 > < @
|/|/ @
     @@
216  LATIN CAPITAL LETTER O WITH STROKE
   _____ @
  / _// \\@
 / //// /@
/ //// / @
\\_//__/  @
         @@
217  LATIN CAPITAL LETTER U WITH GRAVE
    __  @
  __\\_\\_@
 / / / /@
/ /_/ / @
\\____/  @
        @@
218  LATIN CAPITAL LETTER U WITH ACUTE
     __ @
  __/_/_@
 / / / /@
/ /_/ / @
\\____/  @
        @@
219  LATIN CAPITAL LETTER U WITH CIRCUMFLEX
    //| @
  _|/||_@
 / / / /@
/ /_/ / @
\\____/  @
        @@
220  LATIN CAPITAL LETTER U WITH DIAERESIS
   _   _ @
  (_) (_)@
 / / / / @
/ /_/ /  @
\\____/   @
         @@
221  LATIN CAPITAL LETTER Y WITH ACUTE
   __ @
__/_/_@
\\ \\/ /@
 \\  / @
 /_/  @
      @@
222  LATIN CAPITAL LETTER THORN
    __  @
   / /_ @
  / __ \\@
 / ____/@
/_/     @
        @@
223  LATIN SMALL LETTER SHARP S
     ____ @
    / __ \\@
   / / / /@
  / /_| | @
 / //__/  @
/_/       @@
224  LATIN SMALL LETTER A WITH GRAVE
    __  @
  __\\_\\_@
 / __ \`/@
/ /_/ / @
\\__,_/  @
        @@
225  LATIN SMALL LETTER A WITH ACUTE
     __ @
  __/_/_@
 / __ \`/@
/ /_/ / @
\\__,_/  @
        @@
226  LATIN SMALL LETTER A WITH CIRCUMFLEX
    //| @
  _|/||_@
 / __ \`/@
/ /_/ / @
\\__,_/  @
        @@
227  LATIN SMALL LETTER A WITH TILDE
    /\\//@
  _//\\/_@
 / __ \`/@
/ /_/ / @
\\__,_/  @
        @@
228  LATIN SMALL LETTER A WITH DIAERESIS
   _   _ @
  (_)_(_)@
 / __ \`/ @
/ /_/ /  @
\\__,_/   @
         @@
229  LATIN SMALL LETTER A WITH RING ABOVE
     __ @
  __(())@
 / __ \`/@
/ /_/ / @
\\__,_/  @
        @@
230  LATIN SMALL LETTER AE
           @
  ____ ___ @
 / __ \` _ \\@
/ /_/   __/@
\\__,_____/ @
           @@
231  LATIN SMALL LETTER C WITH CEDILLA
       @
  _____@
 / ___/@
/ /__  @
\\___/  @
/_)    @@
232  LATIN SMALL LETTER E WITH GRAVE
   __ @
  _\\_\\@
 / _ \\@
/  __/@
\\___/ @
      @@
233  LATIN SMALL LETTER E WITH ACUTE
    __@
  _/_/@
 / _ \\@
/  __/@
\\___/ @
      @@
234  LATIN SMALL LETTER E WITH CIRCUMFLEX
    //|@
  _|/||@
 / _ \\ @
/  __/ @
\\___/  @
       @@
235  LATIN SMALL LETTER E WITH DIAERESIS
   _  _ @
  (_)(_)@
 / _ \\  @
/  __/  @
\\___/   @
        @@
236  LATIN SMALL LETTER I WITH GRAVE
   __ @
   \\_\\@
  / / @
 / /  @
/_/   @
      @@
237  LATIN SMALL LETTER I WITH ACUTE
    __@
   /_/@
  / / @
 / /  @
/_/   @
      @@
238  LATIN SMALL LETTER I WITH CIRCUMFLEX
    //|@
   |/||@
  / /  @
 / /   @
/_/    @
       @@
239  LATIN SMALL LETTER I WITH DIAERESIS
  _   _ @
 (_)_(_)@
  / /   @
 / /    @
/_/     @
        @@
240  LATIN SMALL LETTER ETH
     || @
    =||=@
 ___ || @
/ __\` | @
\\____/  @
        @@
241  LATIN SMALL LETTER N WITH TILDE
     /\\//@
   _//\\/ @
  / __ \\ @
 / / / / @
/_/ /_/  @
         @@
242  LATIN SMALL LETTER O WITH GRAVE
    __ @
  __\\_\\@
 / __ \\@
/ /_/ /@
\\____/ @
       @@
243  LATIN SMALL LETTER O WITH ACUTE
     __@
  __/_/@
 / __ \\@
/ /_/ /@
\\____/ @
       @@
244  LATIN SMALL LETTER O WITH CIRCUMFLEX
    //|@
  _|/||@
 / __ \\@
/ /_/ /@
\\____/ @
       @@
245  LATIN SMALL LETTER O WITH TILDE
    /\\//@
  _//\\/ @
 / __ \\ @
/ /_/ / @
\\____/  @
        @@
246  LATIN SMALL LETTER O WITH DIAERESIS
   _   _ @
  (_)_(_)@
 / __ \\  @
/ /_/ /  @
\\____/   @
         @@
247  DIVISION SIGN
       @
    _  @
 __(_)_@
/_____/@
 (_)   @
       @@
248  LATIN SMALL LETTER O WITH STROKE
        @
  _____ @
 / _// \\@
/ //// /@
\\_//__/ @
        @@
249  LATIN SMALL LETTER U WITH GRAVE
    __  @
  __\\_\\_@
 / / / /@
/ /_/ / @
\\__,_/  @
        @@
250  LATIN SMALL LETTER U WITH ACUTE
     __ @
  __/_/_@
 / / / /@
/ /_/ / @
\\__,_/  @
        @@
251  LATIN SMALL LETTER U WITH CIRCUMFLEX
    //| @
  _|/||_@
 / / / /@
/ /_/ / @
\\__,_/  @
        @@
252  LATIN SMALL LETTER U WITH DIAERESIS
   _   _ @
  (_) (_)@
 / / / / @
/ /_/ /  @
\\__,_/   @
         @@
253  LATIN SMALL LETTER Y WITH ACUTE
      __ @
   __/_/_@
  / / / /@
 / /_/ / @
 \\__, /  @
/____/   @@
254  LATIN SMALL LETTER THORN
     __  @
    / /_ @
   / __ \\@
  / /_/ /@
 / .___/ @
/_/      @@
255  LATIN SMALL LETTER Y WITH DIAERESIS
    _   _ @
   (_) (_)@
  / / / / @
 / /_/ /  @
 \\__, /   @
/____/    @@
`},89099:(_,e,t)=>{_.exports=t(6763)}}]);