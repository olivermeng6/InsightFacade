import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as JSZip from "jszip";
import * as Parse5 from "parse5";
import * as http from "http";
import Log from "../Util";
import * as fs from "fs-extra";
import {AddBuildingHelper} from "./AddBuildingHelper";


export class AddRoomDataSetHelper {
    private insightDS: InsightDataset[] = [];
    private roomsfinal: any[] = [];
    private rooms: any[] = [];
    private promises: any[] = [];
    private buildingPromises: any[] = [];
    private roomPath: string[] = [];
    private buildings: any[] = [];
    private nzip: JSZip = null;
    private validZip: boolean = false;
    private foundTable: boolean = false;
    private idRooms: Map<string, any[]> = new Map<string, any[]>();
    private addBuildingHelper = new AddBuildingHelper();

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let that = this;
        let zip = this.reset();
        return new Promise<string[]>(((resolve, reject) => {
            if (id === null || id === undefined) {
                return reject(new InsightError());
            }
            if (id === "" || id.charAt(0) === " " || id.includes("_") === true) {
                return reject(new InsightError("id invalid"));
            }
            for (let d of that.insightDS) {
                if (d.id === id) {
                    return reject(new InsightError("id invalid"));
                }
            }
            return zip.loadAsync(content, {base64: true}).then((nzip: JSZip) => {
                that.nzip = nzip;
                return nzip.file("rooms/index.htm").async("text");
            }).then((index: any) => {
                this.makeBuildingPromises(index, that);
                return Promise.all(that.buildingPromises);
            }).then((promiseArray: any) => {
                that.buildings = that.addBuildingHelper.latlonBuildings(promiseArray);
                that.roomPath = that.addBuildingHelper.getRoomsPath();
                that.roomPath.forEach((path: string) => {
                    let roomFilePath = "rooms" + path.substr(1);
                    that.promises.push(that.nzip.file(roomFilePath).async("text"));
                });
                return Promise.all(that.promises);
            }).then((promiseArray: any[]) => {
                promiseArray.forEach((d: any) => {
                    that.renderJSON(id, d);
                });
                that.validZip = that.addBuildingHelper.getValidZip();
                if (that.validZip) {
                    let idArray = this.finalize(id, that, kind);
                    return resolve(idArray);
                } else {
                    return reject(new InsightError("Async Failed"));
                }
            }).catch((err) => {
                Log.trace(err);
                return reject(new InsightError("Async Failed"));
            });

        }));
    }

    private makeBuildingPromises(index: any, that: this) {
        let indexes = Parse5.parse(index);
        that.addBuildingHelper.makeBuilding(indexes);
        that.buildings = that.addBuildingHelper.getBuildings();
        that.buildings.forEach((building: any) => {
            let buildingAddr = building["address"];
            that.buildingPromises.push(this.latlongHelper(buildingAddr));
        });
    }

    private finalize(id: string, that: this, kind: InsightDatasetKind) {
        const room: InsightDataset = {
            id: id,
            numRows: this.roomsfinal.length,
            kind: kind
        };
        that.insightDS.push(room);
        let idArray: string[] = [];
        that.insightDS.forEach((d: any) => {
            idArray.push(d.id);
        });
        this.idRooms.set(id, this.roomsfinal);
        fs.writeFileSync("./data/" + id + ".json", JSON.stringify(this.roomsfinal));
        return idArray;
    }

    private renderJSON(id: string, d: any) {
        try {
            let building = this.buildings[0];
            this.buildings.splice(0, 1);
            this.rooms = this.addBuildingHelper.findRooms(d);
            this.rooms.forEach((room) => {
                let roomfinal: any = {};
                roomfinal[id + "_fullname"] = building["fullname"];
                roomfinal[id + "_shortname"] = building["shortname"];
                roomfinal[id + "_number"] = room["number"];
                roomfinal[id + "_name"] = roomfinal[id + "_shortname"] + "_" + roomfinal[id + "_number"];
                roomfinal[id + "_address"] = building["address"];
                roomfinal[id + "_lat"] = building["lat"];
                roomfinal[id + "_lon"] = building["lon"];
                roomfinal[id + "_seats"] = Number(room["seats"]);
                roomfinal[id + "_type"] = room["type"];
                roomfinal[id + "_furniture"] = room["furniture"];
                roomfinal[id + "_href"] = room["href"];
                this.roomsfinal.push(roomfinal);
            });
        } catch (e) {
            return;
        }
    }

    private latlongHelper(addr: string): Promise<any> {
        let httpAddr = addr.split(" ").join("%20");
        let httpLink = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team089/" + httpAddr;
        return new Promise((resolve, reject) => {
            http.get(httpLink, (res) => {
                res.setEncoding("utf8");
                let rawData = "";
                res.on("data", (chunk) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        return resolve(JSON.parse(rawData));
                    } catch (e) {
                        return reject(e);
                    }
                });
            }).on("error", (e) => {
                return reject(e);
            });
        });
    }

    private reset() {
        let zip = new JSZip();
        this.nzip = null;
        this.promises = [];
        this.roomsfinal = [];
        this.rooms = [];
        this.roomPath = [];
        this.buildings = [];
        this.foundTable = false;
        this.validZip = false;
        return zip;
    }

    public getInsightDS() {
        return this.insightDS;
    }

    public getIDRooms() {
        return this.idRooms;
    }
}
