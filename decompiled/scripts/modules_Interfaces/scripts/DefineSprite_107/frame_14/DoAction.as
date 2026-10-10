verou = 1;
stop();
characName_txt.setText(dofus.Translator.getText("CREATE_CHARACTER_NAME"),"Font1");
Selection.setFocus("characNameValue_txt");
characNameValue_txt.restrict = "A-Za-z\\-";
characNameValue_txt.maxChars = 20;
