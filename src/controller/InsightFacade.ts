import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import {AddCourseDataSetHelper} from "./AddCourseDataSetHelper";
import * as fs from "fs-extra";
import {QueryCheckValid} from "./QueryCheckValid";
import {QueryPerformer} from "./QueryPerformer";
import {AddRoomDataSetHelper} from "./AddRoomDataSetHelper";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private insightDS: InsightDataset[] = [];
    private idCourses: Map<string, any[]> = new Map<string, any[]>();
    private courseDataSetHelper = new AddCourseDataSetHelper();
    private roomDataSetHelper = new AddRoomDataSetHelper();

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.load();
    }


    private load() {
        let files = fs.readdirSync("./data/");
        for (let file of files) {
            let id = file.split(".json")[0];
            let sectionSTR = fs.readFileSync("./data/" + file, "utf8");
            let section = JSON.parse(sectionSTR);
            this.idCourses.set(id, section);
            const course: InsightDataset = {
                id: id,
                numRows: section.length,
                kind: InsightDatasetKind.Courses
            };
            this.insightDS.push(course);
        }
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        try {
            if (kind === InsightDatasetKind.Courses) {
                return this.courseDataSetHelper.addDataset(id, content, kind).then((p) => {
                    if (this.insightDS.length === 0) {
                    this.insightDS = this.courseDataSetHelper.getinsightDS();
                    this.idCourses = this.courseDataSetHelper.getidCourses();
                    return Promise.resolve(p);
                    } else {
                        let i = this.courseDataSetHelper.getinsightDS();
                        let c = this.courseDataSetHelper.getidCourses();
                        return Promise.resolve(this.makeInsightDSandIDCourses(i, c));
                    }
                });
            } else {
                return this.roomDataSetHelper.addDataset(id, content, kind).then((p) => {
                    if (this.insightDS.length === 0) {
                    this.insightDS = this.roomDataSetHelper.getInsightDS();
                    this.idCourses = this.roomDataSetHelper.getIDRooms();
                    return Promise.resolve(p);
                    } else {
                        let i = this.roomDataSetHelper.getInsightDS();
                        let c = this.roomDataSetHelper.getIDRooms();
                        return Promise.resolve(this.makeInsightDSandIDCourses(i, c));
                    }
                });
            }
        } catch (e) {
            return Promise.reject(new InsightError());
        }
    }

    private makeInsightDSandIDCourses(i: InsightDataset[], c: Map<string, any[]>) {
        for (let insight of i) {
            let find: boolean = false;
            for (let d of this.insightDS) {
                if (d.id === insight.id) {
                    find = true;
                }
            }
            if (!find) {
                this.insightDS.push(insight);
            }
        }
        c.forEach((value, key) => {
            if (!this.idCourses.has(key)) {
                this.idCourses.set(key, value);
            }
        });
        let idArray: string[] = [];
        this.insightDS.forEach((d: any) => {
            idArray.push(d.id);
        });
        return idArray;
    }

    public removeDataset(id: string): Promise<string> {
        try {
            if (id === null || id === undefined) {
                return Promise.reject(new InsightError());
            }
            if (id === "" || id.charAt(0) === " " || id.includes("_") === true) {
                return Promise.reject(new InsightError("id invalid"));
            }
            if (this.idCourses.has(id)) {
                this.idCourses.delete(id);
                for (let d of this.insightDS) {
                    if (d.id === id) {
                        const index = this.insightDS.indexOf(d, 0);
                        if (index > -1) {
                            this.insightDS.splice(index, 1);
                        }
                    }
                }
                return Promise.resolve(id);
            } else {
                return Promise.reject(new NotFoundError("Not found file!"));
            }
        } catch (e) {
            return Promise.reject(new InsightError());
        }
    }


    public performQuery(query: any): Promise<any[]> {
        let CheckValid = new QueryCheckValid(this.idCourses);
        try {
            CheckValid.queryVaild(query);
        } catch (err) {
            return Promise.reject(new InsightError(err.message));
        }
        return new QueryPerformer().performQuery(query, this.idCourses);
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.insightDS);
    }
}
