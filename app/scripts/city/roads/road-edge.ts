import _ = require('lodash');

import Direction = require('city/direction');
import Coord = require('city/coord');
import RoadPart = require('city/roads/road-part');
import RoadPartType = require('city/roads/road-part-type');
import serialization = require('city/city-serialization');

class RoadEdge {
  constructor (private start: Coord, private end: Coord) {
    if (start.x === end.x && start.y === end.y) throw new Error(`Road edges must have a length, not just cover one cell (here ${start})`);
    if (start.x !== end.x && start.y !== end.y) throw new Error(`Road edges may be straight lines only but coords were ${start}->${end}`);
  }

  private get direction(): Direction {
    if (this.start.x === this.end.x) {
      if (this.start.y < this.end.y) return Direction.South;
      else return Direction.North;
    } else {
      if (this.start.x < this.end.x) return Direction.East;
      else return Direction.West;
    }
  }

  get parts(): RoadPart[] {
    var type: RoadPartType = {
      [Direction.North]: RoadPartType.StraightNorthSouth,
      [Direction.East]:  RoadPartType.StraightEastWest,
      [Direction.South]: RoadPartType.StraightNorthSouth,
      [Direction.West]:  RoadPartType.StraightEastWest
    }[this.direction];

    return this.coords.map((c) => new RoadPart(c, type));
  }

  get coords(): Coord[] {
    if (this.direction === Direction.East) {
      let y = this.start.y;
      return _.range(this.start.x, this.end.x + 1).map((x) => new Coord(x, y));
    } else if (this.direction === Direction.West) {
      let y = this.start.y;
      return _.range(this.end.x, this.start.x + 1).map((x) => new Coord(x, y));
    } else if (this.direction === Direction.South) {
      let x = this.start.x;
      return _.range(this.start.y, this.end.y + 1).map((y) => new Coord(x, y));
    } else {
      let x = this.start.x;
      return _.range(this.end.y, this.start.y + 1).map((y) => new Coord(x, y));
    }
  }

  serialize(): serialization.RoadData {
    return {
      start: this.start.serialize(),
      end: this.end.serialize()
    }
  }

  static deserialize(data: serialization.RoadData): RoadEdge {
    return new RoadEdge(Coord.deserialize(data.start), Coord.deserialize(data.end));
  }
}

export = RoadEdge;