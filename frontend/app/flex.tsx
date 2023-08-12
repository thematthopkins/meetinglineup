import {ReactElement} from 'react';
import {ReactNode, CSSProperties} from 'react';


type ChildGrow = "expandFirstChild" | "expandLastChild" | "expandChildrenEqually";

export function Flex(p:{children:ReactNode, direction:"row"|"column", childGrow?: ChildGrow, style?:CSSProperties|undefined}):ReactElement {
    return <div 
        className={p.direction + " " + (p.childGrow ?? "expandEqually")} 
      style={{...p.style, display: 'flex', flexDirection: p.direction }}
     >
       {p.children}
    </div>
}

export function Row(p:{children:ReactNode, childGrow?:ChildGrow}):ReactElement {
    return Flex({...p, direction: "row", style: {flexGrow: 1, flexBasis: "100%", flexWrap: "wrap", alignItems: "center", gap: "10px"}});
}

export function Column(p:{children:ReactNode, childGrow?:ChildGrow}):ReactElement {
    return Flex({...p, style: {gap: "10px"}, direction: "column"});
}
