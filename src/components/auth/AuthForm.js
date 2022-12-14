import React, { useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { setDoc, doc } from "firebase/firestore";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

import AuthContext from "../store/auth-context";
import { db, apiKey } from "../../firebase-config";
import { allActivities } from "../../helpers/allActivities";
import {
  CountryDropdown,
  RegionDropdown,
  CountryRegionData,
} from "react-country-region-selector";
import classes from "./authForm.module.css";

function AuthForm(props) {
  const [isLogin, setIsLogin] = useState(props.signIn);
  const [isReset, setIsReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const emailInputRef = useRef();
  const passwordInputRef = useRef();
  const firstNameInputRef = useRef();
  const lastNameInputRef = useRef();
  const birthDateRef = useRef();
  const genderRef1 = useRef();
  const genderRef2 = useRef();

  const navigate = useNavigate();

  const authContext = useContext(AuthContext);

  const [country, setCountry] = useState(null);
  const [region, setRegion] = useState(null);

  const switchHandler = (e) => {
    e.preventDefault();
    setIsLogin((prevState) => !prevState);
  };

  let allActivitiesObj = {};
  const activities = { completions: [], lastVisited: "" };

  Object.entries(allActivities).forEach((activityGroup) => {
    activityGroup[1].forEach((activity) => {
      const newObj = { [activity.link.replaceAll("/", "")]: { ...activities } };
      allActivitiesObj = { ...allActivitiesObj, ...newObj };
    });
  });

  const submitHandler = (e) => {
    e.preventDefault();

    if (isReset) {
      resetPassword();
      return;
    }

    var enteredEmail = emailInputRef.current.value;
    var enteredPassword = passwordInputRef.current.value;
    var enteredFname = isLogin ? "" : firstNameInputRef.current.value;
    var enteredLname = isLogin ? "" : lastNameInputRef.current.value;
    var enteredCountry = country;
    var enteredRegion = region;
    var defaultProfilePic =
      "https://firebasestorage.googleapis.com/v0/b/auditorytrainingapp.appspot.com/o/profilePictures%2Fdefault%2Fdefault.jpg?alt=media&token=276e66bb-1827-403b-bb6a-839d6cb9916b";
    var defaultAboutMe = "";
    var defaultAboutHearingLoss = "";
    var enteredBirthDate = null;
    var enteredGender1 = null;
    var enteredGender2 = null;
    if (!isLogin) {
      enteredBirthDate = birthDateRef.current.value;
      enteredGender1 = genderRef1.current.value;
      enteredGender2 = genderRef2.current.value;
    }

    setIsLoading(true);
    let url;
    if (isLogin) {
      url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    } else {
      url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    }

    fetch(url, {
      method: "POST",
      body: JSON.stringify({
        email: enteredEmail,
        password: enteredPassword,
        returnSecureToken: true,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        setIsLoading(false);
        if (res.ok) {
          return res.json();
        } else {
          //catch error
          return res.json().then((data) => {
            let errorMessage = "Whoops: ";
            if (data?.error.message)
              errorMessage += data.error.message.toLowerCase();
            throw errorMessage;
          });
        }
      })
      .then((data) => {
        setIsLoading(true);
        //sign up and store baasic user info on the users doc in Firebase
        if (!isLogin) {
          const userData = {
            fName: enteredFname,
            lName: enteredLname,
            email: enteredEmail,
            profilePic: defaultProfilePic,
            aboutMe: defaultAboutMe,
            aboutHearingLoss: defaultAboutHearingLoss,
            country: enteredCountry,
            region: enteredRegion,
            birthDate: enteredBirthDate,
            genderPronoun1: enteredGender1,
            genderPronoun2: enteredGender2,
            privateAge: false,
            privateLocation: false,
            privatePronouns: false,
            latestActivities: [],
            allActivitiesObj,
          };
          const UId = doc(db, `users/${data.localId}`);
          setDoc(UId, userData);
        }
        //sign in
        localStorage.setItem("user", data.localId.toString());
        const expTime = new Date(new Date().getTime() + +data.expiresIn * 1000);
        authContext.login(data.idToken, expTime);
        navigate("/dashboard", { replace: true });
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.replaceAll("_", " ") + "!");
      });
  };

  const resetPassword = () => {
    const auth = getAuth();
    const enteredEmail = emailInputRef.current.value;

    sendPasswordResetEmail(auth, enteredEmail)
      .then(() => {
        navigate("/reset", { replace: true });
      })
      .catch((error) => {
        // const errorCode = error.code;
        const errorMessage = error.message;
        setError(errorMessage.replaceAll("_", " ") + "!");
      });
  };

  return (
    <div className={classes.form__container}>
      <form onSubmit={submitHandler} className={classes.form}>
        <h2 className={classes.form__header}>
          {isReset ? "Password Reset" : isLogin ? "Sign In" : "Sign Up"}
        </h2>
        {isReset && (
          <p className={classes.reset__prompt}>
            Please enter your email address below, and a link to reset your
            password will be sent your email.
          </p>
        )}
        {!isLogin && (
          <div className={classes.form__group}>
            <input
              className={classes.form__input}
              id="first-name"
              type="text"
              placeholder="First Name"
              required
              ref={firstNameInputRef}
            />
            <label className={classes.form__label} htmlFor="first-name"></label>
          </div>
        )}
        {!isLogin && (
          <div className={classes.form__group}>
            <input
              className={classes.form__input}
              id="last-name"
              type="text"
              placeholder="Last Name"
              required
              ref={lastNameInputRef}
            />
          </div>
        )}
        <div className={classes.form__group}>
          <input
            className={classes.form__input}
            id="email"
            type="email"
            placeholder="Email Address"
            required
            ref={emailInputRef}
          />
        </div>
        {!isReset && (
          <div className={classes.form__group}>
            <input
              className={classes.form__input}
              id="password"
              type="password"
              placeholder="Password"
              minLength="6"
              required
              ref={passwordInputRef}
            />
          </div>
        )}
        {!isLogin && (
          <div className={classes.form__group}>
            <p>Country and Region:</p>
            <CountryDropdown
              className={classes.form__input}
              value={country}
              onChange={(val) => setCountry(val)}
            />
            <RegionDropdown
              className={classes.form__input}
              country={country}
              value={region}
              onChange={(val) => setRegion(val)}
            />
            <p>Birth Date:</p>
            <input
              className={classes.form__input}
              type="date"
              ref={birthDateRef}
            ></input>
            <p>Gender Pronouns:</p>
            <select className={classes.form__input} ref={genderRef1}>
              <option value="She">She</option>
              <option value="He">He</option>
              <option value="They">They</option>
              <option value="Zie">Zie</option>
              <option value="Sie">Sie</option>
              <option value="Ey">Ey</option>
              <option value="Ve">Ve</option>
              <option value="Tey">Tey</option>
              <option value="E">E</option>
            </select>
            <select className={classes.form__input} ref={genderRef2}>
              <option value="Her">Her</option>
              <option value="Him">Him</option>
              <option value="Them">Them</option>
              <option value="Zim">Zim</option>
              <option value="Sie">Sie</option>
              <option value="Em">Em</option>
              <option value="Ver">Ver</option>
              <option value="Ter">Ter</option>
              <option value="Em">Em</option>
            </select>
          </div>
        )}
        {isLogin && (
          <div className={classes.form__group}>
            <span
              onClick={() => setIsReset(!isReset)}
              className={classes.span_underline}
            >
              {isReset ? "Sign In?" : "Forgot Password?"}
            </span>
          </div>
        )}
        <div className={classes.form__group}>
          {!isLoading ? (
            <button className="btn btn__yellow">
              {isReset ? "Reset Password" : isLogin ? "Sign In" : "Sign Up"}
              &rarr;
            </button>
          ) : (
            <img
              className="loading__img"
              src={require("../../assets/images/loading.gif")}
              alt="Loading"
            />
          )}
        </div>
      </form>
      {error && <p>{`${error}`}</p>}
      <div className={classes.form__switcher}>
        <p onClick={switchHandler}>
          {isReset
            ? ""
            : isLogin && (
                <span>
                  Don't have an account?
                  <span className={classes.span_underline}>Sign Up</span>
                </span>
              )}
          {!isLogin && (
            <span>
              Already have an account?
              <span className={classes.span_underline}>Sign In</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default AuthForm;
