import {SchedRoom, SchedSection, TimeSlot} from "./IScheduler";


export class BuildingConstructor {
    private buildings: Map<string, SchedRoom[]> = new Map<string, SchedRoom[]>();
    private buildingsCapacity: Map<string, number> = new Map<string, number>();
    private roomsTimeSlot: Map<string, TimeSlot[]> = new Map<string, TimeSlot[]>();
    private roomsSections: Map<string, SchedSection[]> = new Map<string, SchedSection[]>();
    private courseTimeSlots: Map<string, TimeSlot[]> = new Map<string, TimeSlot[]>();
    private maxBuilding: string = "";

    public constructBuildings(rooms: SchedRoom[]) {
        rooms.forEach((r) => {
            let roomName = this.getRoomName(r);
            let name = r.rooms_shortname;
            if (this.buildings.has(name)) {
                let arr = this.buildings.get(name);
                arr.push(r);
                this.buildings.set(name, arr);
                let cap = this.buildingsCapacity.get(name);
                cap += r.rooms_seats;
                this.buildingsCapacity.set(name, cap);
                this.roomsTimeSlot.set(roomName, []);
                this.roomsSections.set(roomName, []);
            } else {
                let arr: SchedRoom[] = [];
                arr.push(r);
                this.buildings.set(name, arr);
                this.buildingsCapacity.set(name, r.rooms_seats);
                this.roomsTimeSlot.set(roomName, []);
                this.roomsSections.set(roomName, []);
            }
        });
        this.findMaxCap();
    }

    public registerSectioninMaxBuilding(section: SchedSection): boolean {
        let cap = this.buildingsCapacity.get(this.maxBuilding);
        let enrol = this.sectionEnrolled(section);
        let sectionName = this.getSectionName(section);
        if (!this.courseTimeSlots.has(sectionName)) {
            this.courseTimeSlots.set(sectionName, []);
        }
        if (cap < enrol) {
            return false;
        }
        let suitableRoom: SchedRoom = this.findSuitableRoom(this.maxBuilding, section);
        if (suitableRoom === null || suitableRoom === undefined) {
            return false;
        }
        let timeslots = this.findAvaliableTimeSlotsfromRoomandSection(this.getRoomName(suitableRoom),
            this.getSectionName(section));
        this.registerSectionHelper(timeslots[0], section, this.getRoomName(suitableRoom));
        return true;
    }

    private getRoomName(r: SchedRoom) {
        return r.rooms_shortname + "_" + r.rooms_number;
    }

    private sectionEnrolled(section: SchedSection): number {
        return section.courses_audit + section.courses_fail + section.courses_pass;
    }

    public findMaxCap() {
        let maxName: string = "";
        let maxCap: number = 0;
        this.buildingsCapacity.forEach((c, b) => {
            if (c > maxCap) {
                maxCap = c;
                maxName = b;
            }
        });
        this.maxBuilding = maxName;
    }

    public removeMaxbuilding() {
        let name = this.maxBuilding;
        this.buildingsCapacity.delete(name);
        this.buildings.delete(name);
        this.findMaxCap();
    }

    private isRoomFull(n: string) {
        return this.roomsTimeSlot.get(n).length === 15;
    }

    private findSuitableRoom(building: string, section: SchedSection): SchedRoom {
        let roomsinBuilding = this.buildings.get(building);
        let finalRoom: SchedRoom;
        roomsinBuilding.forEach((r) => {
            if (finalRoom !== undefined) {
                if (r.rooms_seats >= finalRoom.rooms_seats) {
                    return;
                }
            }
            if (r.rooms_seats >= this.sectionEnrolled(section) && !this.isRoomFull(this.getRoomName(r)) &&
                this.findAvaliableTimeSlotsfromRoomandSection(this.getRoomName(r),
                    this.getSectionName(section)).length !== 0) {
                finalRoom = r;
            }
        });
        return finalRoom;
    }

    // assumes a non full room!
    private findAvaliableTimeSlotsfromRoomandSection(room: string, section: string) {
        let timeSlotAll: TimeSlot[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100",
            "MWF 1100-1200", "MWF 1200-1300", "MWF 1300-1400",
            "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700",
            "TR  0800-0930", "TR  0930-1100", "TR  1100-1230",
            "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];
        let roomTimeslot: TimeSlot[] = this.roomsTimeSlot.get(room);
        let sectionTimeSlot: TimeSlot[] = this.courseTimeSlots.get(section);
        roomTimeslot.forEach((timeslot: TimeSlot) => {
            if (timeSlotAll.includes(timeslot)) {
                let n = timeSlotAll.indexOf(timeslot);
                timeSlotAll.splice(n, 1);
            }
        });
        sectionTimeSlot.forEach((timeslot: TimeSlot) => {
            if (timeSlotAll.includes(timeslot)) {
                let n = timeSlotAll.indexOf(timeslot);
                timeSlotAll.splice(n, 1);
            }
        });
        return timeSlotAll;
    }

    private registerSectionHelper(time: TimeSlot, section: SchedSection, room: string) {
        let sectionName = this.getSectionName(section);
        let roomTimeArr = this.roomsTimeSlot.get(room);
        roomTimeArr.push(time);
        this.roomsTimeSlot.set(room, roomTimeArr);
        let sectionTimeArr = this.courseTimeSlots.get(sectionName);
        sectionTimeArr.push(time);
        this.courseTimeSlots.set(sectionName, sectionTimeArr);
        let sectionsinRooms = this.roomsSections.get(room);
        sectionsinRooms.push(section);
        this.roomsSections.set(room, sectionsinRooms);
    }

    private getSectionName(section: SchedSection) {
        return section.courses_dept + "_" + section.courses_id;
    }

    public getMaxBuilding() {
        return this.maxBuilding;
    }

    public areRoomsAllUsed(): boolean {
        return this.buildings.size === 0;
    }

    public getRoomsTimeSlot() {
        return this.roomsTimeSlot;
    }

    public getRoomsSections() {
        return this.roomsSections;
    }

    public setMaxBuild(name: string) {
        this.maxBuilding = name;
    }
}
