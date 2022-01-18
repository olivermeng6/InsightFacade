import {InsightError} from "./IInsightFacade";
import * as Parse5 from "parse5";
import {DefaultTreeNode} from "parse5";
import Log from "../Util";


export class AddBuildingHelper {
    private address: any[] = [];
    private rooms: any[] = [];
    private shortname: any[] = [];
    private roomPath: string[] = [];
    private buildings: any[] = [];
    private tbody: DefaultTreeNode[] = [];
    private fullName: string[] = [];
    private validZip: boolean = false;
    private foundTable: boolean = false;


    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.reset();
    }

    public findRooms(roomhtml: any): any[] {
        let indexes = Parse5.parse(roomhtml);
        this.rooms = [];
        this.foundTable = false;
        this.tableHelper(indexes);
        this.roomPath = [];
        this.fullName = [];
        if (this.foundTable && this.tbody.length > 0) {
            let table = this.tbody[0];
            this.tbody.splice(0, 1);
            this.validZip = true;
            this.tbodyHelper(table, false);
            return this.rooms;
        } else {
            throw new InsightError("No valid table");
        }
    }

    public latlonBuildings(promiseArry: any[]): any[] {
        for (let l in promiseArry) {
            let latlon = promiseArry[l];
            let building = this.buildings[l];
            building["lat"] = latlon["lat"];
            building["lon"] = latlon["lon"];
        }
        return this.getBuildings();
    }

    public makeBuilding(indexes: any) {
        this.findRoomsPath(indexes);
        this.makeBuildingHelper();
    }

    private findRoomsPath(indexes: any) {
        this.tableHelper(indexes);
        if (this.foundTable && this.tbody.length > 0) {
            let table = this.tbody[0];
            this.tbody.splice(0, 1);
            this.tbodyHelper(table, true);
        } else {
            throw new InsightError("No valid table");
        }
    }

    private tbodyHelper(tbodyNode: any, isPath: boolean) {
        if ("childNodes" in tbodyNode) {
            for (let trNode of tbodyNode.childNodes) {
                if ("childNodes" in trNode && "nodeName" in trNode && trNode.nodeName === "tr") {
                    if (isPath) {
                        this.tbNodeHelperRoomPath(trNode);
                    } else {
                        this.tbNodeHelperRoom(trNode);
                    }
                }
            }
        }
    }

    private tbNodeHelperRoom(trNode: any) {
        let room: any = {};
        trNode.childNodes.forEach((tdNode: any) => {
            if ("childNodes" in tdNode && "nodeName" in tdNode && tdNode.nodeName === "td") {
                if ("attrs" in tdNode && "value" in tdNode.attrs[0]) {
                    let field = tdNode.attrs[0].value;
                    if (field === "views-field views-field-field-room-number") {
                        room["number"] = this.findChildParamRoomNumber(tdNode);
                    }
                    if (field === "views-field views-field-field-room-capacity") {
                        let seats = this.findChildParam(tdNode);
                        if (seats === "") {
                            room["seats"] = 0;
                        } else {
                            room["seats"] = seats;
                        }
                    }
                    if (field === "views-field views-field-field-room-furniture") {
                        room["furniture"] = this.findChildParam(tdNode);
                    }
                    if (field === "views-field views-field-field-room-type") {
                        room["type"] = this.findChildParam(tdNode);
                    }
                    if (field === "views-field views-field-nothing") {
                        room["href"] = this.findChildParamHRef(tdNode);
                        this.rooms.push(room);
                    }
                }
            }
        });
    }

    private tbNodeHelperRoomPath(trNode: any) {
        for (let tdNode of trNode.childNodes) {
            if ("childNodes" in tdNode && "nodeName" in tdNode && tdNode.nodeName === "td") {
                if ("attrs" in tdNode && "value" in tdNode.attrs[0]) {
                    let field = tdNode.attrs[0].value;
                    if (field === "views-field views-field-field-building-code") {
                        this.shortname.push(this.findChildParam(tdNode));
                    }
                    if (field === "views-field views-field-title") {
                        this.fullName.push(this.findChildParamRoomNumber(tdNode));
                    }
                    if (field === "views-field views-field-field-building-address") {
                        this.address.push(this.findChildParam(tdNode));
                    }
                    if (field === "views-field views-field-nothing") {
                        this.roomPath.push(this.findChildParamHRef(tdNode));
                    }
                }
            }
        }
    }

    private makeBuildingHelper() {
        for (let i in this.address) {
            let building: any = {};
            building["shortname"] = this.shortname[i];
            building["fullname"] = this.fullName[i];
            building["address"] = this.address[i];
            this.buildings.push(building);
        }
    }

    public getBuildings() {
        return this.buildings;
    }

    public getRoomsPath() {
        return this.roomPath;
    }

    public getValidZip() {
        return this.validZip;
    }

    private tableHelper(indexes: any) {
        if ("nodeName" in indexes && indexes.nodeName === "tbody"
            && this.getB(indexes)) {
            this.foundTable = true;
            this.tbody.push(indexes);
        } else if ("childNodes" in indexes) {
            indexes.childNodes.forEach((childindexes: any) => {
                this.tableHelper(childindexes);
            });
        }
    }

    private getB(indexes: any) {
        return indexes.childNodes[1].childNodes[1].attrs[0].value === "views-field views-field-field-room-number"
            || indexes.childNodes[1].childNodes[1].attrs[0].value === "views-field views-field-field-building-image";
    }

    private reset() {
        this.buildings = [];
        this.shortname = [];
        this.address = [];
        this.fullName = [];
        this.roomPath = [];
        this.rooms = [];
        this.tbody = [];
    }

    private findChildParam(tdNode: any) {
        return tdNode.childNodes[0].value.trim();
    }

    private findChildParamRoomNumber(tdNode: any) {
        return tdNode.childNodes[1].childNodes[0].value.trim();
    }

    private findChildParamHRef(tdNode: any) {
        return tdNode.childNodes[1].attrs[0].value.trim();
    }
}
