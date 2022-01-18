import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import {BuildingConstructor} from "./BuildingConstructor";

export default class Scheduler implements IScheduler {
    private buildingConstructor = new BuildingConstructor();
    private vistedArr: string[] = [];
    private preLat: number;
    private preLon: number;

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        if (sections.length === 0 || rooms.length === 0) {
            return [];
        }
        let declinedFromMaxSections: SchedSection[] = [];
        this.sortSections(sections);
        this.buildingConstructor.constructBuildings(rooms);
        let currBuilding = this.buildingConstructor.getMaxBuilding();
        this.getBuildinglatlon(currBuilding, rooms);
        sections.forEach((section) => {
            if (!this.buildingConstructor.registerSectioninMaxBuilding(section)) {
                declinedFromMaxSections.push(section);
            }
        });
        this.buildingConstructor.removeMaxbuilding();
        this.vistedArr.push(currBuilding);
        if (declinedFromMaxSections.length !== 0) {
            this.sortRoomsbyMaxBuilding(rooms);
            while (declinedFromMaxSections.length !== 0) {
                currBuilding = this.findNextBuilding(rooms);
                if (currBuilding === "") {
                    break;
                }
                this.buildingConstructor.setMaxBuild(currBuilding);
                let tempSectionArr: SchedSection[] = [];
                declinedFromMaxSections.forEach((section) => {
                    if (!this.buildingConstructor.registerSectioninMaxBuilding(section)) {
                        tempSectionArr.push(section);
                    }
                });
                declinedFromMaxSections = tempSectionArr;
                this.buildingConstructor.removeMaxbuilding();
                this.vistedArr.push(currBuilding);
                if (this.buildingConstructor.areRoomsAllUsed()) {
                    break;
                }
            }
        }
        return this.renderSchedule(this.buildingConstructor.getRoomsTimeSlot(),
            this.buildingConstructor.getRoomsSections(), rooms);
    }

    private findNextBuilding(rooms: SchedRoom[]): string {
        let curr: string = "";
        for (let room of rooms) {
            if (!this.vistedArr.includes(room.rooms_shortname)) {
                curr = room.rooms_shortname;
                break;
            }
        }
        return curr;
    }

    private getBuildinglatlon(name: string, rooms: SchedRoom[]) {
        for (let room of rooms) {
            if (room.rooms_shortname === name) {
                this.preLat = room.rooms_lat;
                this.preLon = room.rooms_lon;
                return;
            }
        }
    }

    private findDistance(lat1: number, lon1: number, lat2: number, lon2: number) {

        let R = 6371e3; // metres
        let l1 = lat1 * Math.PI / 180;
        let l2 = lat2 * Math.PI / 180;
        if (lat1 === lat2 && lon1 === lon2) {
            return 0;
        }
        let deltaP = (lat2 - lat1) * Math.PI / 180;
        let deltaL = (lon2 - lon1) * Math.PI / 180;

        let a = Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
            Math.cos(l1) * Math.cos(l2) *
            Math.sin(deltaL / 2) * Math.sin(deltaL / 2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        let d = R * c;
        return d;
    }

    private sortRoomsbyMaxBuilding(rooms: SchedRoom[]) {
        let that = this;
        rooms.sort(comparer);

        function comparer(a: SchedRoom, b: SchedRoom) {
            let lat1: number = a.rooms_lat;
            let lon1: number = a.rooms_lon;
            let lat2: number = b.rooms_lat;
            let lon2: number = b.rooms_lon;
            let lat: number = that.preLat;
            let lon: number = that.preLon;
            let d1 = that.findDistance(lat1, lon1, lat, lon);
            let d2 = that.findDistance(lat2, lon2, lat, lon);
            return d1 - d2;
        }
    }

    private sortSections(sections: SchedSection[]) {
        sections.sort(comparer);

        function comparer(a: SchedSection, b: SchedSection) {
            let cap1 = a.courses_pass + a.courses_fail + a.courses_audit;
            let cap2 = b.courses_pass + b.courses_fail + b.courses_audit;
            return cap2 - cap1;
        }
    }

    private renderSchedule(roomsTimeSlot: Map<string, TimeSlot[]>,
                           roomsSections: Map<string, SchedSection[]>,
                           room: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let final: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        let a: SchedRoom;
        let b: SchedSection;
        let c: TimeSlot;
        roomsTimeSlot.forEach((value, key) => {
            value.forEach((timeSlot) => {
                let arrayElement: [SchedRoom, SchedSection, TimeSlot] = [a, b, c];
                arrayElement.splice(0, 3);
                let nameArr = key.split("_");
                let roomShort = nameArr[0];
                let roomNumber = nameArr[1];
                for (let r of room) {
                    if (r.rooms_shortname === roomShort && r.rooms_number === roomNumber) {
                        arrayElement.push(r);
                    }
                }
                let index = value.indexOf(timeSlot);
                arrayElement.push(roomsSections.get(key)[index]);
                arrayElement.push(timeSlot);
                final.push(arrayElement);
            });
        });
        return final;
    }
}
