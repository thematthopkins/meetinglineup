import Cell from './cell'

interface Player {
    kind: "player";
}

interface Wall {
    kind: "wall";
}

interface Box {
    kind: "box";
}

type CellType = Player | Wall | Box;


export default function Page() {
  /*
  var level:Array<Array<CellType>> = 
    [
        [{kind: "wall"}, {kind: "wall"}, {kind: "wall"}],
        [{kind: "wall"}, {kind: "player"}, {kind: "wall"}],
        [{kind: "wall"}, {kind: "wall"}, {kind: "wall"}],
    ];
*/

  return <div><Cell></Cell><Cell></Cell></div>
}
