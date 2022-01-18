import {InsightError} from "./IInsightFacade";
import Log from "../Util";

export class QueryCheckValid {
    private regexpValidKey = new RegExp("^[^_]+_(avg || pass || fail || audit || year || lat ||lon " +
        "|| seats || dept || id || instructor || title || uuid || fullname " +
        "|| shortname || number || name || address || type || furniture || href)$");

    private columns: string[] = [];
    private idCourses: Map<string, any[]> = new Map<string, any[]>();
    private id: any;
    private applyKeyTest: RegExp = /^[^_]+$/;


    constructor(idCourses: Map<string, any[]>) {
        this.idCourses = idCourses;
    }

    public queryVaild(q: any) {
        let that = this;
        this.getId(q);
        if (q === null) {
            throw new InsightError("query not vaild");
        }
        if (Object.keys(q).length < 2 || Object.keys(q).length > 3) {
            throw new InsightError("query not vaild");
        }
        if (Object.keys(q).length === 3) {
            let keys = Object.keys(q).filter(((value: string) => {
                return value !== "WHERE" && value !== "OPTIONS" && value !== "TRANSFORMATIONS";
            }));
            if (keys.length !== 0) {
                throw new InsightError("query contains invalid key");
            }
            if (Object.keys(q["TRANSFORMATIONS"]).length !== 2) {
                throw new InsightError("Extra keys in TRANSFORMATIONS");
            }
            let group: string[] = q["TRANSFORMATIONS"]["GROUP"];
            let apply: string[] = [];
            this.groupValid(group);
            q["TRANSFORMATIONS"]["APPLY"].forEach((applyRule: any) => {
                this.applyRuleValid(applyRule, apply);
            });
            q["OPTIONS"]["COLUMNS"].forEach((column: string) => {
                if (!apply.includes(column) && !group.includes(column)) {
                    throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
                }
            });
        }
        // try {
        //     let w = q["WHERE"];
        //     let o = q["OPTIONS"];
        //     let c = o["COLUMNS"];
        // } catch (e) {
        //     throw new InsightError("query not vaild");
        // }
        that.optValid(q["OPTIONS"]);
        that.whereValid(q["WHERE"]);
    }

    private applyRuleValid(applyRule: any, apply: string[]) {
        if (Object.keys(applyRule).length !== 1) {
            throw new InsightError("more than one apply key in apply rule");
        }
        let applyKey = Object.keys(applyRule)[0];
        if (!this.applyKeyTest.test(applyKey)) {
            throw new InsightError("Cannot have underscore in applyKey");
        }
        if (apply.includes(applyKey)) {
            throw new InsightError("Duplicate APPLY key" + applyKey);
        }
        if (Object.keys(applyRule[applyKey]).length !== 1) {
            throw new InsightError("CApply body should only have 1 key");
        }
        apply.push(applyKey);
        let applyToken = Object.keys(applyRule[applyKey])[0];
        if (!this.isValidApplyToken(applyToken)) {
            throw new InsightError("Invalid Apply token");
        }
        if (this.isNumericToken(applyToken) &&
            !(this.isNumericKey(applyRule[applyKey][applyToken].split(`_`)[1]))) {
            throw new InsightError("numeric token can only be used on numeric keys");
        }
    }

    private optValid(opt: any) {
        if (!(typeof opt === "object" && !(opt instanceof Array) && opt !== null
            && (Object.keys(opt).length === 1 || Object.keys(opt).length === 2))) {
            throw new InsightError("Options not valid!");
        }
        this.columns = opt["COLUMNS"];
        try {
            this.colValid(opt["COLUMNS"]);
        } catch (e) {
            throw new InsightError("Columns not valid!");
        }
        if (Object.keys(opt).length === 2) {
            if (!("COLUMNS" in opt && "ORDER" in opt)) {
                throw new InsightError("Options not valid!");
            }
            let o = opt["ORDER"];
            if (typeof o === "string") {
                let b = false;
                for (let c of opt["COLUMNS"]) {
                    if (c === o) {
                        b = true;
                    }
                }
                if (!b) {
                    throw new InsightError("Order not valid!");
                }
            } else if (typeof o === "object" && o !== null) {
                if (Object.keys(o).length !== 2) {
                    throw new InsightError("Extra keys in ORDER");
                }
                if (o["keys"].length === 0) {
                    throw new InsightError("GROUP must be a non-empty array");
                }
                let keys = o["keys"].filter(((value: string) => {
                    return !opt["COLUMNS"].includes(value);
                }));
                if (keys.length !== 0) {
                    throw new InsightError("All ORDER keys must be in COLUMNS");
                }
                if (o["dir"] !== "UP" && o["dir"] !== "DOWN") {
                    throw new InsightError("Invalid Dir");
                }
            } else {
                throw new InsightError("Order has wrong type");
            }
        }

    }

    private colValid(col: any) {
        if (!(col instanceof Array)) {
            throw new InsightError("Columns not valid!");
        }
    }

    private whereValid(where: any) {
        if (!(where !== null && typeof where === "object" && Object.keys(where).length <= 1)) {
            throw new InsightError("WHERE is not valid 1");
        }
        if (Object.keys(where).length === 1) {
            let k = Object.keys(where)[0];
            if (k === "IS") {
                this.isValid(where["IS"]);
            } else if (k === "NOT") {
                this.whereValid(where["NOT"]);
            } else if (k === "GT" || k === "LT" || k === "EQ") {
                this.mcomValid(where[k]);
            } else if (k === "AND" || k === "OR") {
                this.logicValid(where[k]);
            } else {
                throw new InsightError("WHERE is not valid 2");
            }
        }
    }

    private logicValid(l: any) {
        if (!(l !== null && l instanceof Array && l.length >= 1)) {
            throw new InsightError("IS is not valid");
        } else {
            for (let w of l) {
                if (Object.keys(w).length !== 0) {
                    this.whereValid(w);
                } else {
                    throw new InsightError("IS is not valid");
                }
            }
        }
    }

    private mcomValid(m: any) {
        if (!(m !== null && typeof m === "object" && Object.keys(m).length === 1)) {
            throw new InsightError("GT is not valid");
        }
        if (this.isMkey(Object.keys(m)[0])) {
            let value = m[Object.keys(m)[0]];
            if (!(Object.keys(m).length === 1 && value !== null && typeof value === "number")) {
                throw new InsightError("GT is not valid");
            }
        } else {
            throw new InsightError("GT key is not valid");
        }
    }

    private isMkey(s: string) {
        let rid = this.id;
        let spl = s.split(`_`);
        if (spl.length !== 2) {
            return false;
        }
        let id = spl[0];
        let key = spl[1];
        return id === rid && (key === "avg"
            || key === "pass" || key === "fail"
            || key === "audit" || key === "year" || key === "lat"
            || key === "lon" || key === "seats");
    }

    private isValid(is: any) {
        if (!(is !== null && typeof is === "object" && Object.keys(is).length === 1)) {
            throw new InsightError("IS is not valid");
        }
        if (this.isSkey(Object.keys(is)[0])) {
            let value = is[Object.keys(is)[0]];
            if (!(Object.keys(is).length === 1 && typeof value === "string")) {
                throw new InsightError("IS value is not valid");
            }
            let a = value.split("*");
            if (!(a.length <= 3 && a.length >= 1)) {
                throw new InsightError("IS value is not valid");
            }
            if (a.length === 3) {
                if (!(a[0].length === 0 && a[2].length === 0)) {
                    throw new InsightError("IS value is not valid");
                }
            }
            if (a.length === 2) {
                if (a[0].length !== 0 && a[1].length !== 0) {
                    throw new InsightError("IS value is not valid 1");

                }
            }
        } else {
            throw new InsightError("IS key is not valid");
        }
    }

    private isSkey(s: string) {
        let realid = this.id;
        let spl = s.split(`_`);
        if (spl.length !== 2) {
            return false;
        }
        let id = spl[0];
        let key = spl[1];
        return id === realid && (key === "dept"
            || key === "id" || key === "instructor"
            || key === "title" || key === "uuid" || key === "fullname"
            || key === "shortname" || key === "number" || key === "name"
            || key === "address" || key === "type" || key === "furniture" || key === "href");
    }

    private getId(q: any) {
        if ("TRANSFORMATIONS" in q) {
            this.id = q["TRANSFORMATIONS"]["GROUP"][0].split(`_`)[0];
        } else {
            this.id = q["OPTIONS"]["COLUMNS"][0].split(`_`)[0];
            this.groupValid(q["OPTIONS"]["COLUMNS"]);
        }
    }

    private isNumericKey(key: any) {
        return key === "avg"
            || key === "pass" || key === "fail"
            || key === "audit" || key === "year" || key === "lat"
            || key === "lon" || key === "seats";
    }

    private isNumericToken(token: any) {
        return token === "MAX" || token === "MIN" || token === "SUM" || token === "AVG";
    }

    private isValidApplyToken(token: any) {
        return token === "MAX" || token === "MIN" || token === "AVG" || token === "COUNT" || token === "SUM";
    }

    private groupValid(group: string[]) {
        group.forEach((s) => {
            if (!this.isMkey(s) && !this.isSkey(s)) {
                throw new InsightError("group contains invalid key");
            }
        });
    }

}
