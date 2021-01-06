import Cookies from "js-cookie";
import { Observable } from "../util/observe";
import { assert, Mutable } from "../util/util";
import { FileData } from "../view/editors";
import { UserInfo } from "./user";

export type ProjectData = {
    id: number;
    exercise_id?: number | null;
    last_modified: string; // date
    contents: string;
    is_public: boolean;
    name: string;
}

export function extractFiles(projectData: ProjectData) : FileData[] {
    return JSON.parse(projectData.contents).files;
}

type ProjectListMessages =
    "projectSelected";


export class MyProjects {

    public observable = new Observable<ProjectListMessages>(this);

    private element: JQuery;
    private listElem: JQuery;

    public readonly projects: readonly ProjectData[] = [];

    public constructor(element: JQuery) {
        assert(element.length > 0);
        this.element = element;
        this.listElem = $('<div class="list-group"></div>').appendTo(element);
    }

    public setProjects(projects: readonly ProjectData[]) {
        (<Mutable<this>>this).projects = projects;

        this.listElem.empty();

        projects.forEach(project => {
            $(`<a href="#" class="list-group-item">${project.name}</a>`)
                .appendTo(this.listElem)
                .on("click", () => {
                    this.observable.send("projectSelected", project);
                });
        });

    } 

    
}

// var ProjectList = Lobster.Outlets.CPP.ProjectList = Class.extend(Observable, {
//     _name: "ProjectList",

//     API_URL : "/api/me/project/list",

//     // element should be a jquery object
//     init: function(element) {
//         this.i_element = element;
//         element.addClass("projectList");

//         this.refresh();
//     },

//     refresh : function() {
//         this.ajax({
//             type: "GET",
//             url: this.API_URL,
//             success: function(data) {
//                 this.i_setList(data);
//             },
//             dataType: "json"
//         });
//     },

//     i_setList : function(projects) {
//         

//         this.i_element.empty();

//         for(var i = 0; i < projects.length; i++) {
//             var project = projects[i];
//             var item = $("<li></li>");
//             var link = $('<a class="link lobster-code" data-toggle="pill">' + project["project"] + '</a>');
//             item.append(link);
//             link.click(function() {
//                 self.send("loadProject", $(this).html());
//             });

//             this.i_element.append(item);
//         }
//     }

// });