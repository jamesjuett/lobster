import Cookies from "js-cookie";
import { UserInfo } from "./user";

export class MyProjects {

    private element: JQuery;
    private listElem: JQuery;

    public user: UserInfo;

    public constructor(element: JQuery, user: UserInfo) {
        this.user = user;

        this.element = element;
        this.listElem = $("<li></li>").appendTo(element);

        this.refresh();
    }

    public async refresh() {
        
        const response = await fetch(`api/users/me/projects`, {
            method: 'GET',
            headers: {
                'Authorization': 'bearer ' + Cookies.get('bearer')
            }
        });

        console.log(await response.json());
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