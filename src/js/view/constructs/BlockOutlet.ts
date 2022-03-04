import { CompiledBlock, RuntimeBlock } from "../../core/constructs/statements/Block";
import { ConstructOutlet } from "./ConstructOutlet";
import { createStatementOutlet } from "./StatementOutlets";

const CURLY_OPEN = "<span class=\"curly-open\">{</span>";
const CURLY_CLOSE = "<span class=\"curly-close\">}</span>";

export class BlockOutlet extends ConstructOutlet<RuntimeBlock> {

    public constructor(element: JQuery, construct: CompiledBlock, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.removeClass("codeInstance");
        this.element.addClass("braces");
        this.element.append(" "); // spaces before braces :)
        this.element.append(CURLY_OPEN);
        this.element.append("<br />");
        let innerElem = $("<span class=\"inner\"><span class=\"lobster-highlight\"></span></span>");
        innerElem.addClass("code-indentedBlockBody");
        this.element.append(innerElem);

        // this.gotoLinks = [];
        //let statementElems = [];
        this.construct.statements.forEach(stmt => {
            let lineElem = $('<span class="blockLine"></span>');
            let elem = $("<span></span>");
            let child = createStatementOutlet(elem, stmt, this);

            // let gotoLink = $('<span class="gotoLink link">>></span>');
            // lineElem.append(gotoLink);
            // this.gotoLinks.push(gotoLink);
            // //gotoLink.css("visibility", "hidden");
            // let self = this;
            // // wow this is really ugly lol. stupid closures
            // gotoLink.click(
            //     function (x) {
            //         return function () {
            //             if (!self.inst){
            //                 return;
            //             }
            //             var me = $(this);
            //             //if (self.gotoInProgress){
            //             //    return;
            //             //}
            //             //self.gotoInProgress = true;
            //             var temp = me.html();
            //             if (me.html() == "&lt;&lt;"){
            //                 self.simOutlet.simOutlet.stepBackward(self.simOutlet.sim.stepsTaken() - self.inst.childInstances.statements[x].stepsTaken);
            //                 return;
            //             }
            //             me.addClass("inProgress");
            //             self.inst.pauses[x] = {pauseAtIndex: x, callback: function(){
            //                 //self.gotoInProgress = false;
            //                 me.removeClass("inProgress");
            //             }};
            //             //if (self.inst.pauses[x]){
            //                 self.simOutlet.send("skipToEnd");
            //             //}
            //         };
            //     }(i));
            lineElem.append(elem);
            innerElem.append(lineElem);
            innerElem.append("<br />");
        });

        this.element.append("<br />");
        this.element.append(CURLY_CLOSE);

    }

}
