class user{
    constructor(fname , lname , Email , Username, password , aptAddress, street, city, state, areaCode, phone) {
        this.Fname = fname;
        this.Lname = lname;
        this.Email = Email;
        this.Username = Username;
        this.Password = password;
        this.AptAddress = aptAddress;
        this.Street = street;
        this.City = city;
        this.State = state;
        this.AreaCode = areaCode;
        this.Phone = phone;
    }
}

module.exports = user;