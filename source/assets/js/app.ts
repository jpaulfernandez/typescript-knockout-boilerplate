import { User } from './User';
import * as ko from "knockout";


class ViewModel {

	user:User = new User();

	constructor(user_ctx:{userName:string,password:string})
	{
		this.user.userName = ko.observable(user_ctx.userName);			
		this.user.password = ko.observable(user_ctx.password);
	}


}

let a = new ViewModel({userName:'paul',password:'paul'});

let subscriber = a.user.userName.subscribe(function(newValue){
	alert(newValue);
})

ko.applyBindings(a);