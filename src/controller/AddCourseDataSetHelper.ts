import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as JSZip from "jszip";
import Log from "../Util";
import * as fs from "fs-extra";

export class AddCourseDataSetHelper {
    private insightDS: InsightDataset[] = [];
    private sections: any[] = [];
    private promises: any[] = [];
    private rows: number = 0;
    private validZip: boolean = false;
    private idCourses: Map<string, any[]> = new Map<string, any[]>();

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
            nzip.folder("courses").forEach((relativePath, file) => {
                let filePromise = file.async("text");
                that.promises.push(filePromise);
            });
            return Promise.all(that.promises);
        }).then((promiseArray: any[]) => {
            promiseArray.forEach((d: any) => {
                that.loadJSON(id, d);
            });
            if (that.validZip) {
                const course: InsightDataset = {
                    id: id,
                    numRows: that.rows,
                    kind: kind
                };
                that.insightDS.push(course);
                let idArray: string[] = [];
                that.insightDS.forEach((d: any) => {
                    idArray.push(d.id);
                });
                this.idCourses.set(id, this.sections);
                fs.writeFileSync("./data/" + id + ".json", JSON.stringify(this.sections));
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

    private reset() {
        let zip = new JSZip();
        this.rows = 0;
        this.promises = [];
        this.sections = [];
        this.validZip = false;
        return zip;
    }

    private loadJSON(id: string, tempCourse: string) {
        // tempCourses contains all files received from zip
        let that = this;
        try {
            let curr = JSON.parse(tempCourse);
            if (!("result" in curr) || !(curr["result"] instanceof Array)) {
                return;
            }
            let currSections = curr["result"];
            if (currSections.length > 0) {
                for (let j of currSections) {
                    if (that.vaild(j)) {
                        let section: any = {};
                        section[id + "_avg"] = j["Avg"];
                        section[id + "_audit"] = j["Audit"];
                        section[id + "_id"] = j["Course"];
                        section[id + "_fail"] = j["Fail"];
                        section[id + "_pass"] = j["Pass"];
                        section[id + "_instructor"] = j["Professor"];
                        section[id + "_dept"] = j["Subject"];
                        section[id + "_title"] = j["Title"];
                        section[id + "_uuid"] = j["id"].toString();
                        if (j["Section"] === "overall") {
                            section[id + "_year"] = 1900;
                        } else {
                            section[id + "_year"] = Number(j["Year"]);
                        }
                        that.rows++;
                        that.sections.push(section);
                    }
                }
            }
        } catch (e) {
            return;
        }
    }

    private vaild(j: any) {
        if (!("Avg" in j) || !("Audit" in j)
            || !("id" in j) || !("Year" in j)
            || !("Course" in j) || !("Fail" in j)
            || !("Pass" in j) || !("Professor" in j)
            || !("Subject" in j) || !("Title" in j)) {
            return false;
        }
        if (!(typeof j["Avg"] === "number") || !(typeof j["Audit"] === "number")
            || !(typeof j["Pass"] === "number") || !(typeof j["Fail"] === "number")
            || !(typeof j["Year"] === "string") || !(typeof j["id"] === "number")
            || !(typeof j["Course"] === "string") || !(typeof j["Professor"] === "string")
            || !(typeof j["Subject"] === "string") || !(typeof j["Title"] === "string")) {
            return false;
        }
        this.validZip = true;
        return true;
    }

    public getinsightDS() {
        return this.insightDS;
    }

    public getidCourses() {
        return this.idCourses;
    }
}
